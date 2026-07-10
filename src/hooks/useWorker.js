import { useEffect, useRef, useCallback } from 'react';

export function useWorker() {
  const workerRef = useRef(null);
  const handlersRef = useRef({});

  useEffect(() => {
    const worker = new Worker(`${import.meta.env.BASE_URL}xlsxWorker.js?v=2`);

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (handlersRef.current[type]) {
        handlersRef.current[type](e.data);
      }
    };

    worker.onerror = (err) => {
      const errMsg = `Worker error: ${err.message} (${err.filename}:${err.lineno}:${err.colno})`;
      console.error(errMsg, err);
      if (handlersRef.current['error']) {
        handlersRef.current['error']({ message: errMsg });
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const postMessage = useCallback((msg) => {
    if (workerRef.current) {
      workerRef.current.postMessage(msg);
    }
  }, []);

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler;
  }, []);

  const off = useCallback((type) => {
    delete handlersRef.current[type];
  }, []);

  return { postMessage, on, off };
}
