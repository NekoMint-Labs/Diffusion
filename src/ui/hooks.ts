import { useSyncExternalStore } from 'react';
import type { ProjectController, CoreSnapshot } from '../core/controller.ts';
export const useProject = (controller: ProjectController): CoreSnapshot => useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
