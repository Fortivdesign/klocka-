import { contextBridge, ipcRenderer } from 'electron';
import type { ActivitySample, ClockEvent, ScreenshotMeta } from '../shared/types';

const api = {
  consent: {
    get: (): Promise<boolean> => ipcRenderer.invoke('consent:get'),
    set: (granted: boolean): Promise<boolean> => ipcRenderer.invoke('consent:set', granted),
  },
  clock: {
    in: (userId: string, note?: string): Promise<ClockEvent> =>
      ipcRenderer.invoke('clock:in', { userId, note }),
    out: (userId: string, note?: string): Promise<{ event: ClockEvent; session: { start: number; end: number; samples: ActivitySample[]; screenshots: ScreenshotMeta[] } }> =>
      ipcRenderer.invoke('clock:out', { userId, note }),
  },
  tracker: {
    status: (): Promise<{ clockedIn: boolean; sessionStart: number | null; sampleCount: number }> =>
      ipcRenderer.invoke('tracker:status'),
    samples: (): Promise<ActivitySample[]> => ipcRenderer.invoke('tracker:samples'),
  },
  screenshot: {
    pending: (): Promise<ScreenshotMeta[]> => ipcRenderer.invoke('screenshot:pending'),
    approve: (id: string, approved: boolean): Promise<boolean> =>
      ipcRenderer.invoke('screenshot:approve', id, approved),
    captureNow: (): Promise<ScreenshotMeta | null> =>
      ipcRenderer.invoke('screenshot:capture-now'),
  },
  dialog: {
    selectFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-file'),
  },
  on: (channel: 'tray:toggle-clock', listener: () => void) => {
    const wrap = () => listener();
    ipcRenderer.on(channel, wrap);
    return () => ipcRenderer.removeListener(channel, wrap);
  },
};

contextBridge.exposeInMainWorld('klocka', api);

export type KlockaApi = typeof api;
