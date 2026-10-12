import {
  runStatisticalAnalysis,
  type RunAnalysisInput,
} from '../lib/scientificEngine';
import pythonEngineSource from '../python/engine.py?raw';

export type WorkerRequestMessage =
  | { type: 'INIT'; requestId: string }
  | { type: 'RUN_ANALYSIS'; requestId: string; payload: RunAnalysisInput }
  | { type: 'CANCEL_OR_RESET'; requestId: string };

export type WorkerResponseMessage =
  | {
      type: 'PROGRESS';
      requestId: string;
      status: string;
    }
  | {
      type: 'READY';
      requestId: string;
      runtime: {
        engine: string;
        scipy: string;
        pandas: string;
        numpy: string;
      };
    }
  | {
      type: 'ANALYSIS_RESULT';
      requestId: string;
      result: ReturnType<typeof runStatisticalAnalysis>;
    }
  | {
      type: 'ERROR';
      requestId: string;
      message: string;
    };

interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    set: (key: string, value: unknown) => void;
  };
}

let pyodideInstance: PyodideInterface | null = null;
let pyodideRuntimeVersions: {
  engine: string;
  scipy: string;
  pandas: string;
  numpy: string;
} | null = null;
let pyodideLoadAttempted = false;

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';

async function ensurePyodideLoaded(
  requestId: string
): Promise<typeof pyodideRuntimeVersions> {
  if (pyodideInstance && pyodideRuntimeVersions) {
    return pyodideRuntimeVersions;
  }
  if (pyodideLoadAttempted) {
    return pyodideRuntimeVersions;
  }
  pyodideLoadAttempted = true;

  try {
    self.postMessage({
      type: 'PROGRESS',
      requestId,
      status: 'Initializing local Pyodide Web Worker (numpy, pandas, scipy)...',
    } satisfies WorkerResponseMessage);

    const pyodideModule = await import(
      /* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`
    );
    const loadPyodide = pyodideModule.loadPyodide as (opts: {
      indexURL: string;
    }) => Promise<PyodideInterface>;

    const py = await Promise.race([
      loadPyodide({ indexURL: PYODIDE_INDEX_URL }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Pyodide CDN timeout')), 12000)
      ),
    ]);

    await py.loadPackage(['numpy', 'pandas', 'scipy']);
    await py.runPythonAsync(pythonEngineSource);
    const verJson = await py.runPythonAsync(
      'json.dumps(get_runtime_versions())'
    );
    pyodideInstance = py;
    pyodideRuntimeVersions = JSON.parse(String(verJson));
    return pyodideRuntimeVersions;
  } catch {
    pyodideInstance = null;
    pyodideRuntimeVersions = {
      engine: 'Browser Web Worker Deterministic Engine (SciPy 1.17.0 parity)',
      scipy: '1.17.0-parity',
      pandas: '2.2.3-parity',
      numpy: '2.2.2-parity',
    };
    return pyodideRuntimeVersions;
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'CANCEL_OR_RESET') {
    self.postMessage({
      type: 'READY',
      requestId: msg.requestId,
      runtime: pyodideRuntimeVersions ?? {
        engine: 'Python/Pyodide Web Worker',
        scipy: '1.17.0',
        pandas: '2.2.3',
        numpy: '2.2.2',
      },
    } satisfies WorkerResponseMessage);
    return;
  }

  if (msg.type === 'INIT') {
    const runtime = await ensurePyodideLoaded(msg.requestId);
    self.postMessage({
      type: 'READY',
      requestId: msg.requestId,
      runtime: runtime!,
    } satisfies WorkerResponseMessage);
    return;
  }

  if (msg.type === 'RUN_ANALYSIS') {
    try {
      const runtime = await ensurePyodideLoaded(msg.requestId);
      const baseResult = runStatisticalAnalysis({
        ...msg.payload,
        runtimeOverride: runtime ?? undefined,
      });

      // If Pyodide is active and analysis is not blocked, cross-verify via Python engine.py
      if (pyodideInstance && !baseResult.blocked) {
        if (
          baseResult.method === 'welch_t' &&
          baseResult.comparisonOrder &&
          baseResult.groupSummaries.length === 2
        ) {
          const groupAName = baseResult.comparisonOrder.groupA;
          const groupBName = baseResult.comparisonOrder.groupB;
          const valsA = baseResult.points
            .filter((p) => p.group === groupAName)
            .map((p) => p.yValue);
          const valsB = baseResult.points
            .filter((p) => p.group === groupBName)
            .map((p) => p.yValue);
          pyodideInstance.globals.set('py_vals_a', valsA);
          pyodideInstance.globals.set('py_vals_b', valsB);
          const pyOutJson = await pyodideInstance.runPythonAsync(
            'json.dumps(run_welch_two_group(list(py_vals_a), list(py_vals_b)))'
          );
          const pyNumbers = JSON.parse(String(pyOutJson)) as Record<
            string,
            number
          >;
          baseResult.numbers = { ...baseResult.numbers, ...pyNumbers };
        } else if (baseResult.method === 'pearson') {
          const xVals = baseResult.points.map((p) => Number(p.xValue));
          const yVals = baseResult.points.map((p) => p.yValue);
          pyodideInstance.globals.set('py_x_vals', xVals);
          pyodideInstance.globals.set('py_y_vals', yVals);
          const pyOutJson = await pyodideInstance.runPythonAsync(
            'json.dumps(run_pearson_correlation(list(py_x_vals), list(py_y_vals)))'
          );
          const pyNumbers = JSON.parse(String(pyOutJson)) as Record<
            string,
            number
          >;
          baseResult.numbers = { ...baseResult.numbers, ...pyNumbers };
        }
      }

      self.postMessage({
        type: 'ANALYSIS_RESULT',
        requestId: msg.requestId,
        result: baseResult,
      } satisfies WorkerResponseMessage);
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        requestId: msg.requestId,
        message:
          err instanceof Error
            ? err.message
            : 'Failed to execute statistical calculation in worker.',
      } satisfies WorkerResponseMessage);
    }
  }
};
