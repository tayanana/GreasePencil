import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export function useResource(path) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api(path));
    } catch (err) {
      setError(err.message || 'The garage could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(path)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        if (active) setError(err.message || 'The garage could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return { data, error, loading, reload, setError };
}
