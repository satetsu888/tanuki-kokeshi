use wasm_bindgen::prelude::*;
use std::collections::{BinaryHeap, HashMap, HashSet};
use std::cmp::{Ordering, min};
use serde::{Serialize, Deserialize};

// Hint types matching TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HintOperation {
    #[serde(rename = "type")]
    pub op_type: String,
    pub target: String,
    pub replacement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hint {
    pub name: String,
    pub reading: String,
    pub operation: HintOperation,
    pub description: String,
}

// Search state
#[derive(Debug, Clone)]
struct SearchState {
    text: String,
    path: Vec<String>,
    distance: f64,
    heuristic_score: f64,
}

impl Ord for SearchState {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse for min-heap behavior
        other.heuristic_score.partial_cmp(&self.heuristic_score)
            .unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for SearchState {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for SearchState {
    fn eq(&self, other: &Self) -> bool {
        self.heuristic_score == other.heuristic_score
    }
}

impl Eq for SearchState {}

// Best attempt tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestAttempt {
    pub text: String,
    pub path: Vec<String>,
    pub distance: f64,
}

// Search result
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub found: bool,
    pub path: Vec<String>,
    pub steps: Vec<String>,
    pub best_attempts: Vec<BestAttempt>,
    pub total_states_explored: usize,
}

// Progress update
#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressUpdate {
    pub states_explored: usize,
    pub current_best_distance: f64,
    pub current_best_text: String,
    pub queue_size: usize,
    pub progress_percentage: f64,
    pub estimated_total_states: usize,
    pub depth_progress: f64,
    pub max_depth_reached: usize,
}

#[wasm_bindgen]
pub struct PathfinderEngine {
    // Core data structures
    queue: BinaryHeap<SearchState>,
    visited: HashSet<String>,
    hints: Vec<Hint>,
    
    // Search parameters
    start: String,
    target: String,
    max_depth: usize,
    
    // Tracking
    best_attempts: Vec<BestAttempt>,
    best_distance: f64,
    states_explored: usize,
    estimated_total_states: usize,
    max_depth_reached: usize,
    
    // Caching
    distance_cache: HashMap<(String, String), f64>,
    decode_cache: HashMap<(String, String), Option<String>>,
}

#[wasm_bindgen]
impl PathfinderEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(start: &str, target: &str, hints_json: &str, max_depth: usize) -> Result<PathfinderEngine, JsValue> {
        console_error_panic_hook::set_once();
        
        // Parse hints from JSON
        let hints: Vec<Hint> = serde_json::from_str(hints_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse hints: {}", e)))?;
        
        // Estimate total search space
        let hints_count = hints.len();
        let estimated_total = estimate_search_space(hints_count, max_depth);
        
        let mut engine = PathfinderEngine {
            queue: BinaryHeap::new(),
            visited: HashSet::new(),
            hints,
            start: start.to_string(),
            target: target.to_string(),
            max_depth,
            best_attempts: Vec::new(),
            best_distance: f64::INFINITY,
            states_explored: 0,
            estimated_total_states: estimated_total,
            max_depth_reached: 0,
            distance_cache: HashMap::new(),
            decode_cache: HashMap::new(),
        };
        
        // Initialize with start state
        let start_text = engine.start.clone();
        let target_text = engine.target.clone();
        let initial_distance = engine.calculate_distance(&start_text, &target_text);
        let initial_state = SearchState {
            text: start_text.clone(),
            path: Vec::new(),
            distance: initial_distance,
            heuristic_score: initial_distance,
        };
        
        engine.queue.push(initial_state);
        engine.visited.insert(start_text);
        
        Ok(engine)
    }
    
    // Run search for a specified number of iterations
    pub fn run_iterations(&mut self, iterations: usize) -> JsValue {
        let mut found = false;
        let mut final_path = Vec::new();
        let mut final_steps = Vec::new();
        
        for _ in 0..iterations {
            if self.queue.is_empty() {
                break;
            }
            
            let current = self.queue.pop().unwrap();
            self.states_explored += 1;
            
            // Track max depth reached
            if current.path.len() > self.max_depth_reached {
                self.max_depth_reached = current.path.len();
            }
            
            // Check if we found the target
            if current.text == self.target {
                found = true;
                final_path = current.path.clone();
                final_steps = self.reconstruct_path(&current.path);
                
                // Add to best attempts
                self.update_best_attempts(
                    current.text.clone(),
                    current.path.clone(),
                    current.distance
                );
                break;
            }
            
            // Update best attempts
            self.update_best_attempts(
                current.text.clone(),
                current.path.clone(),
                current.distance
            );
            
            // Skip if we've reached max depth
            if current.path.len() >= self.max_depth {
                continue;
            }
            
            // Generate neighbors
            self.generate_neighbors(&current);
        }
        
        // Return result
        if found {
            let result = SearchResult {
                found: true,
                path: final_path,
                steps: final_steps,
                best_attempts: self.best_attempts.clone(),
                total_states_explored: self.states_explored,
            };
            serde_wasm_bindgen::to_value(&result).unwrap()
        } else {
            // Return progress update
            let progress_percentage = calculate_progress_percentage(
                self.states_explored,
                self.queue.len(),
                self.estimated_total_states
            );
            
            // Calculate depth-based progress
            let depth_progress = if self.max_depth > 0 {
                (self.max_depth_reached as f64 / self.max_depth as f64 * 100.0).min(99.9)
            } else {
                0.0
            };
            
            let progress = ProgressUpdate {
                states_explored: self.states_explored,
                current_best_distance: self.best_distance,
                current_best_text: self.best_attempts.first()
                    .map(|a| a.text.clone())
                    .unwrap_or_default(),
                queue_size: self.queue.len(),
                progress_percentage,
                estimated_total_states: self.estimated_total_states,
                depth_progress,
                max_depth_reached: self.max_depth_reached,
            };
            serde_wasm_bindgen::to_value(&progress).unwrap()
        }
    }
    
    // Check if search is complete
    pub fn is_complete(&self) -> bool {
        self.queue.is_empty()
    }
    
    // Get final result
    pub fn get_result(&self) -> JsValue {
        let result = SearchResult {
            found: false,
            path: Vec::new(),
            steps: Vec::new(),
            best_attempts: self.best_attempts.clone(),
            total_states_explored: self.states_explored,
        };
        serde_wasm_bindgen::to_value(&result).unwrap()
    }
}

// Private implementation methods
impl PathfinderEngine {
    fn generate_neighbors(&mut self, current: &SearchState) {
        for hint in &self.hints.clone() {
            // Skip if hint target not in text (optimization)
            if !current.text.contains(&hint.operation.target) {
                continue;
            }
            
            // Apply hint
            if let Some(new_text) = self.apply_hint(&current.text, hint) {
                // Skip if already visited
                if self.visited.contains(&new_text) {
                    continue;
                }
                
                // Calculate scores
                let target = self.target.clone();
                let distance = self.calculate_distance(&new_text, &target);
                let new_path = {
                    let mut path = current.path.clone();
                    path.push(hint.name.clone());
                    path
                };
                
                // Heuristic includes path length to prefer shorter paths
                let heuristic_score = distance + (new_path.len() as f64) * 0.1;
                
                // Add to queue
                let new_state = SearchState {
                    text: new_text.clone(),
                    path: new_path,
                    distance,
                    heuristic_score,
                };
                
                self.queue.push(new_state);
                self.visited.insert(new_text);
            }
        }
    }
    
    fn apply_hint(&mut self, text: &str, hint: &Hint) -> Option<String> {
        // Check cache
        let cache_key = (text.to_string(), hint.name.clone());
        if let Some(cached) = self.decode_cache.get(&cache_key) {
            return cached.clone();
        }
        
        // Apply hint operation
        let result = match hint.operation.op_type.as_str() {
            "remove" => {
                let new_text = text.replace(&hint.operation.target, "");
                if new_text != text {
                    Some(new_text)
                } else {
                    None
                }
            },
            "replace" => {
                if let Some(replacement) = &hint.operation.replacement {
                    let new_text = text.replace(&hint.operation.target, replacement);
                    if new_text != text {
                        Some(new_text)
                    } else {
                        None
                    }
                } else {
                    None
                }
            },
            _ => None,
        };
        
        // Cache result
        self.decode_cache.insert(cache_key, result.clone());
        result
    }
    
    fn calculate_distance(&mut self, s1: &str, s2: &str) -> f64 {
        // Check cache
        let cache_key = (s1.to_string(), s2.to_string());
        if let Some(&cached) = self.distance_cache.get(&cache_key) {
            return cached;
        }
        
        // Calculate Levenshtein distance
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        let len1 = chars1.len();
        let len2 = chars2.len();
        
        if len1 == 0 {
            return len2 as f64 * 2.0; // Heavy penalty for empty string
        }
        if len2 == 0 {
            return len1 as f64;
        }
        
        // Use two-row optimization for base Levenshtein distance
        let mut prev_row: Vec<u32> = (0..=len2 as u32).collect();
        let mut curr_row = vec![0u32; len2 + 1];
        
        for i in 1..=len1 {
            curr_row[0] = i as u32;
            
            for j in 1..=len2 {
                let cost = if chars1[i - 1] == chars2[j - 1] { 0 } else { 1 };
                curr_row[j] = min(
                    min(prev_row[j] + 1, curr_row[j - 1] + 1),
                    prev_row[j - 1] + cost
                );
            }
            
            std::mem::swap(&mut prev_row, &mut curr_row);
        }
        
        let base_distance = prev_row[len2] as f64;
        
        // N-gram matching bonus
        let ngram_bonus = self.calculate_ngram_bonus(&chars1, &chars2, base_distance);
        
        // Length difference penalty
        let length_penalty = if len1 > len2 {
            // Current is longer than target - light penalty
            // Easier to remove characters
            ((len1 - len2) as f64) * 0.2
        } else if len1 < len2 {
            // Current is shorter than target - heavy penalty
            // Harder to add back characters
            ((len2 - len1) as f64) * 1.5
        } else {
            0.0
        };
        
        // Final weighted distance
        let weighted_distance = base_distance - ngram_bonus + length_penalty;
        
        // Ensure distance is non-negative
        let final_distance = weighted_distance.max(0.0);
        
        // Cache result
        self.distance_cache.insert(cache_key, final_distance);
        
        // Keep cache size reasonable
        if self.distance_cache.len() > 10000 {
            self.distance_cache.clear();
        }
        
        final_distance
    }
    
    fn calculate_ngram_bonus(&self, chars1: &[char], chars2: &[char], base_distance: f64) -> f64 {
        let len1 = chars1.len();
        let len2 = chars2.len();
        
        if len1 < 2 || len2 < 2 {
            return 0.0;
        }
        
        let mut ngram_matches = 0;
        let mut total_possible_ngrams = 0;
        
        // Count 2-gram matches
        let mut bigrams2 = HashSet::new();
        for i in 0..len2.saturating_sub(1) {
            bigrams2.insert((chars2[i], chars2[i + 1]));
        }
        total_possible_ngrams += bigrams2.len();
        
        for i in 0..len1.saturating_sub(1) {
            if bigrams2.contains(&(chars1[i], chars1[i + 1])) {
                ngram_matches += 1;
            }
        }
        
        // Count 3-gram matches (weighted more heavily)
        if len1 >= 3 && len2 >= 3 {
            let mut trigrams2 = HashSet::new();
            for i in 0..len2.saturating_sub(2) {
                trigrams2.insert((chars2[i], chars2[i + 1], chars2[i + 2]));
            }
            total_possible_ngrams += trigrams2.len() * 2; // Weight 3-grams more
            
            for i in 0..len1.saturating_sub(2) {
                if trigrams2.contains(&(chars1[i], chars1[i + 1], chars1[i + 2])) {
                    ngram_matches += 2; // 3-gram matches count double
                }
            }
        }
        
        // Calculate bonus based on n-gram matches
        if total_possible_ngrams > 0 {
            let ngram_ratio = ngram_matches as f64 / total_possible_ngrams as f64;
            // N-gram bonus can reduce distance by up to 40%
            ngram_ratio * base_distance * 0.4
        } else {
            0.0
        }
    }
    
    fn update_best_attempts(&mut self, text: String, path: Vec<String>, distance: f64) {
        // Update best distance
        if distance < self.best_distance {
            self.best_distance = distance;
        }
        
        // Check if already in best attempts
        if let Some(pos) = self.best_attempts.iter().position(|a| a.text == text) {
            // Update if shorter path
            if path.len() < self.best_attempts[pos].path.len() {
                self.best_attempts[pos] = BestAttempt { text, path, distance };
            }
        } else {
            // Add new attempt
            self.best_attempts.push(BestAttempt { text, path, distance });
            
            // Sort and keep top 30
            self.best_attempts.sort_by(|a, b| {
                a.distance.partial_cmp(&b.distance).unwrap_or(Ordering::Equal)
            });
            self.best_attempts.truncate(30);
        }
    }
    
    fn reconstruct_path(&self, path: &[String]) -> Vec<String> {
        let mut steps = vec![self.start.clone()];
        let mut current_text = self.start.clone();
        
        for hint_name in path {
            // Find hint by name
            if let Some(hint) = self.hints.iter().find(|h| h.name == *hint_name) {
                if let Some(new_text) = self.apply_hint_uncached(&current_text, hint) {
                    current_text = new_text.clone();
                    steps.push(new_text);
                }
            }
        }
        
        steps
    }
    
    fn apply_hint_uncached(&self, text: &str, hint: &Hint) -> Option<String> {
        match hint.operation.op_type.as_str() {
            "remove" => {
                let new_text = text.replace(&hint.operation.target, "");
                if new_text != text {
                    Some(new_text)
                } else {
                    None
                }
            },
            "replace" => {
                if let Some(replacement) = &hint.operation.replacement {
                    let new_text = text.replace(&hint.operation.target, replacement);
                    if new_text != text {
                        Some(new_text)
                    } else {
                        None
                    }
                } else {
                    None
                }
            },
            _ => None,
        }
    }
}

// Helper functions

// Estimate the total search space based on hints and depth
fn estimate_search_space(hints_count: usize, max_depth: usize) -> usize {
    // More realistic estimation based on observed patterns:
    // - Most hints only apply to specific patterns
    // - Visited state pruning is very effective
    // - Branching factor decreases with depth
    
    if hints_count == 0 || max_depth == 0 {
        return 1;
    }
    
    // Start with a much lower branching factor
    // In practice, only 10-20% of hints apply to any given state
    let initial_branching = (hints_count as f64 * 0.15).max(1.0);
    
    // Branching factor decreases with depth due to:
    // - More states being already visited
    // - Convergence toward the target
    let mut total = 1.0;
    let mut states_at_depth = 1.0;
    let mut current_branching = initial_branching;
    
    for _depth in 1..=max_depth {
        // Reduce branching factor as we go deeper
        // This models the convergence effect
        current_branching *= 0.8;
        current_branching = current_branching.max(0.5);
        
        states_at_depth *= current_branching;
        total += states_at_depth;
        
        // Cap the growth to prevent unrealistic estimates
        if states_at_depth > 100000.0 {
            // If we're estimating more than 100k states at a single depth,
            // we're probably overestimating
            break;
        }
    }
    
    // Much smaller buffer since our estimate is more conservative
    (total * 1.1).min(1000000.0) as usize // Cap at 1 million max
}

// Calculate progress percentage
fn calculate_progress_percentage(
    states_explored: usize,
    queue_size: usize,
    estimated_total: usize
) -> f64 {
    // If no states left to explore, we're essentially done
    if queue_size == 0 && states_explored > 0 {
        return 99.9; // Not 100% to avoid confusion before final result
    }
    
    if estimated_total == 0 {
        return 0.0;
    }
    
    // Consider both explored states and remaining queue
    let effective_progress = states_explored;
    let mut percentage = effective_progress as f64 / estimated_total as f64 * 100.0;
    
    // Adaptive progress: if we've explored more than our estimate,
    // scale the percentage based on queue size
    if states_explored > estimated_total {
        // We underestimated - use queue size as indicator
        if queue_size < 100 {
            percentage = 90.0 + (100.0 - queue_size as f64) * 0.099;
        } else {
            percentage = 50.0 + (states_explored as f64 / (states_explored + queue_size) as f64) * 40.0;
        }
    }
    
    // Ensure reasonable bounds
    percentage = percentage.max(0.1).min(99.9);
    
    // Show at least 1% after exploring reasonable number of states
    if percentage < 1.0 && states_explored > 10 {
        return 1.0;
    }
    
    percentage
}

#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}