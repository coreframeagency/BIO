import React from 'react';

export interface SSEMessage {
  status: 'reading' | 'generating' | 'saving' | 'complete' | 'error';
  message: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptStream(
  url: string,
  token: string,
  signal: AbortSignal,
  onMessage: (msg: SSEMessage) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      onError(text || `Server error ${response.status}`);
      return false;
    }

    if (!response.body) {
      onError('No response body from server');
      return false;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    const read = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        onDone();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as SSEMessage;
              onMessage(data);
              if (data.status === 'complete' || data.status === 'error') {
                completed = true;
                onDone();
                return;
              }
            } catch {
              // ignore keepalive lines starting with ':'
            }
          }
        }
      }

      if (!completed) {
        return read();
      }
    };

    await read();
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return true; // aborted intentionally — not a failure
    }
    // Network error — caller will retry
    return false;
  }
}

export function useSSE() {
  const [messages, setMessages] = React.useState<SSEMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const startStream = React.useCallback(
    (url: string, token: string) => {
      setMessages([]);
      setIsStreaming(true);
      setError(null);
      setRetryCount(0);

      const controller = new AbortController();

      // Timeout: abort after 6 minutes
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 360000);

      const run = async () => {
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
          if (attempt > 0) {
            // Show retry status to user
            setMessages((prev) => [
              ...prev,
              {
                status: 'reading',
                message: `Connecting... (attempt ${attempt + 1} of ${MAX_RETRIES})`,
              },
            ]);
            await delay(RETRY_DELAY_MS);
          }

          setRetryCount(attempt);

          let streamError: string | null = null;
          let done = false;

          const success = await attemptStream(
            url,
            token,
            controller.signal,
            (msg) => {
              setMessages((prev) => [...prev, msg]);
            },
            () => {
              done = true;
            },
            (err) => {
              streamError = err;
            }
          );

          if (done || success) {
            // Stream completed successfully
            clearTimeout(timeoutId);
            setIsStreaming(false);
            return;
          }

          if (streamError) {
            // Server returned an error response — no point retrying
            clearTimeout(timeoutId);
            setError(streamError);
            setIsStreaming(false);
            return;
          }

          // Network failure — retry
          attempt++;
        }

        // All retries exhausted
        clearTimeout(timeoutId);
        setError(
          'Could not connect to the server after 3 attempts. ' +
          'Please wait 30 seconds and try again — the server may be starting up.'
        );
        setIsStreaming(false);
      };

      void run();
    },
    []
  );

  return { messages, isStreaming, error, retryCount, startStream };
}
