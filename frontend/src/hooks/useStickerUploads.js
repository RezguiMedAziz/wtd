import { useCallback, useRef, useState } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { MAX_UPLOADS, validateUploads } from '../services/stickerService';
import { backgroundRemovalService } from '../services/backgroundRemovalService';

/** Upload → validate → remove background → normalize → add to the collection. One file is processed at a time. */
export function useStickerUploads() {
  const { state, dispatch } = useCustomization();
  const [messages, setMessages] = useState([]);
  const queue = useRef(Promise.resolve());
  const counter = useRef(0);
  const used = useRef(0);
  const sessionRef = useRef(state.sessionId);
  sessionRef.current = state.sessionId;
  used.current = state.uploads.length + state.pending.length;

  const say = useCallback((text) => setMessages((m) => [...m.slice(-3), { id: Math.random(), text }]), []);
  const dismiss = (id) => setMessages((m) => m.filter((x) => x.id !== id));

  const handleFiles = useCallback((fileList) => {
    const { accepted, rejected } = validateUploads(fileList || [], MAX_UPLOADS - used.current);
    rejected.forEach((r) => say(`${r.name}: ${r.reason}`));
    accepted.forEach((file) => {
      counter.current += 1;
      const id = `u_${Date.now().toString(36)}${counter.current}`;
      used.current += 1;
      dispatch({ type: 'addPending', item: { id, name: file.name, status: 'Waiting…' } });
      queue.current = queue.current.then(async () => {
        try {
          dispatch({ type: 'updatePending', id, patch: { status: 'Removing background…' } });
          const res = await backgroundRemovalService.process(file, {
            sessionId: sessionRef.current,
            onProgress: ({ key, ratio }) => dispatch({ type: 'updatePending', id, patch: { status: key?.startsWith('fetch') ? `Loading engine ${Math.round(ratio * 100)}%` : 'Removing background…' } }),
          });
          dispatch({ type: 'addUpload', upload: { id: res.id || id, name: file.name, src: res.src, ar: res.ar } });
        } catch (err) {
          used.current -= 1;
          say(`${file.name}: ${err.message || 'Processing could not be completed.'}`);
        } finally {
          dispatch({ type: 'removePending', id });
        }
      });
    });
  }, [dispatch, say]);

  return { handleFiles, messages, dismiss, used: state.uploads.length + state.pending.length, max: MAX_UPLOADS };
}
