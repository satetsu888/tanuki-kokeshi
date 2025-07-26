use wasm_bindgen::prelude::*;
use std::collections::BinaryHeap;
use std::cmp::{Ordering, min};

#[wasm_bindgen]
pub struct PathfinderOptimizer {
    levenshtein_buffer: Vec<u32>,
}

#[wasm_bindgen]
impl PathfinderOptimizer {
    #[wasm_bindgen(constructor)]
    pub fn new(max_string_length: usize) -> PathfinderOptimizer {
        PathfinderOptimizer {
            levenshtein_buffer: vec![0; (max_string_length + 1) * 2],
        }
    }

    pub fn levenshtein_distance(&mut self, s1: &str, s2: &str) -> u32 {
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        let len1 = chars1.len();
        let len2 = chars2.len();

        if len1 == 0 {
            return len2 as u32;
        }
        if len2 == 0 {
            return len1 as u32;
        }

        let width = len2 + 1;
        let buffer = &mut self.levenshtein_buffer;
        
        for j in 0..=len2 {
            buffer[j] = j as u32;
        }

        let mut prev_row_idx = 0;
        let mut curr_row_idx = width;

        for i in 1..=len1 {
            buffer[curr_row_idx] = i as u32;

            for j in 1..=len2 {
                let cost = if chars1[i - 1] == chars2[j - 1] { 0 } else { 1 };
                
                buffer[curr_row_idx + j] = min(
                    min(
                        buffer[prev_row_idx + j] + 1,     // deletion
                        buffer[curr_row_idx + j - 1] + 1  // insertion
                    ),
                    buffer[prev_row_idx + j - 1] + cost   // substitution
                );
            }

            std::mem::swap(&mut prev_row_idx, &mut curr_row_idx);
        }

        buffer[prev_row_idx + len2]
    }

    pub fn char_frequency_distance(&self, s1: &str, s2: &str) -> f64 {
        let mut freq1 = [0u32; 65536];
        let mut freq2 = [0u32; 65536];
        
        for ch in s1.chars() {
            let idx = ch as usize;
            if idx < 65536 {
                freq1[idx] += 1;
            }
        }
        
        for ch in s2.chars() {
            let idx = ch as usize;
            if idx < 65536 {
                freq2[idx] += 1;
            }
        }
        
        let mut distance = 0.0;
        for i in 0..65536 {
            let diff = (freq1[i] as i32 - freq2[i] as i32).abs();
            distance += diff as f64;
        }
        
        distance
    }
}

#[wasm_bindgen]
pub struct PriorityQueue {
    heap: BinaryHeap<QueueItem>,
}

#[wasm_bindgen]
pub struct QueueItem {
    priority: i32,
    data: String,
}

impl Ord for QueueItem {
    fn cmp(&self, other: &Self) -> Ordering {
        other.priority.cmp(&self.priority)
    }
}

impl PartialOrd for QueueItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for QueueItem {
    fn eq(&self, other: &Self) -> bool {
        self.priority == other.priority
    }
}

impl Eq for QueueItem {}

#[wasm_bindgen]
impl PriorityQueue {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PriorityQueue {
        PriorityQueue {
            heap: BinaryHeap::new(),
        }
    }

    pub fn push(&mut self, priority: i32, data: String) {
        self.heap.push(QueueItem { priority, data });
    }

    pub fn pop(&mut self) -> Option<String> {
        self.heap.pop().map(|item| item.data)
    }

    pub fn is_empty(&self) -> bool {
        self.heap.is_empty()
    }

    pub fn len(&self) -> usize {
        self.heap.len()
    }
}

#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}