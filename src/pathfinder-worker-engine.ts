// Web Worker using WASM pathfinder engine

import init, { PathfinderEngine } from './wasm-pathfinder/tanuki_pathfinder.js';

// Message types
interface WorkerMessage {
  type: 'search' | 'cancel' | 'init';
  start?: string;
  target?: string;
  maxDepth?: number;
  hints?: any[];
}

interface WorkerResult {
  type: 'result' | 'progress' | 'cancelled' | 'initialized' | 'error';
  found?: boolean;
  path?: string[];
  steps?: string[];
  bestAttempts?: any[];
  progress?: number;
  currentBest?: {
    text: string;
    distance: number;
    path: string[];
  };
  error?: string;
}

// Global state
let cancelled = false;
let wasmInitialized = false;
let currentEngine: PathfinderEngine | null = null;

// Initialize WASM
async function initializeWasm() {
  if (wasmInitialized) return;
  
  await init();
  wasmInitialized = true;
}

// Run search using WASM engine
async function runSearch(
  start: string,
  target: string,
  hints: any[],
  maxDepth: number
): Promise<WorkerResult> {
  // Check for trivial case
  if (start === target) {
    return {
      type: 'result',
      found: true,
      path: [],
      steps: [start],
      bestAttempts: []
    };
  }
  
  // Create new engine
  try {
    const hintsJson = JSON.stringify(hints);
    currentEngine = new PathfinderEngine(start, target, hintsJson, maxDepth);
  } catch (error) {
    console.error('Failed to create PathfinderEngine:', error);
    return {
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to create engine'
    };
  }
  
  const ITERATIONS_PER_BATCH = 100;
  const UPDATE_INTERVAL_MS = 100;
  let lastUpdateTime = Date.now();
  
  // Run search loop
  while (!currentEngine.is_complete() && !cancelled) {
    // Run batch of iterations
    const result = currentEngine.run_iterations(ITERATIONS_PER_BATCH);
    
    // Check if we have a final result
    if (result.found !== undefined) {
      // Found the target
      return {
        type: 'result',
        found: result.found,
        path: result.path || [],
        steps: result.steps || [],
        bestAttempts: result.best_attempts || []
      };
    }
    
    // Send progress update
    const now = Date.now();
    if (now - lastUpdateTime >= UPDATE_INTERVAL_MS && result.states_explored !== undefined) {
      self.postMessage({
        type: 'progress',
        progress: result.states_explored,
        currentBest: result.current_best_text ? {
          text: result.current_best_text,
          distance: result.current_best_distance || 0,
          path: [] // Not provided in progress updates
        } : undefined
      });
      lastUpdateTime = now;
      
      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Get final result
  if (cancelled) {
    const finalResult = currentEngine.get_result();
    return {
      type: 'cancelled',
      bestAttempts: finalResult.best_attempts || []
    };
  } else {
    const finalResult = currentEngine.get_result();
    return {
      type: 'result',
      found: false,
      path: [],
      steps: [],
      bestAttempts: finalResult.best_attempts || []
    };
  }
}

// Message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;
  
  if (type === 'init') {
    console.log('Initializing WASM engine...');
    try {
      await initializeWasm();
      console.log('WASM engine initialized successfully');
      self.postMessage({ type: 'initialized' });
    } catch (error) {
      console.error('Failed to initialize WASM:', error);
      self.postMessage({ type: 'initialized' });
    }
    return;
  }
  
  if (type === 'cancel') {
    cancelled = true;
    return;
  }
  
  if (type === 'search') {
    cancelled = false;
    const { start, target, maxDepth, hints } = event.data;
    
    console.log('Search request received:', { start, target, maxDepth, hintsCount: hints?.length });
    
    if (!start || !target || !hints) {
      console.error('Missing required search parameters');
      return;
    }
    
    const result = await runSearch(start, target, hints, maxDepth || 20);
    console.log('Search result:', result);
    self.postMessage(result);
  }
});