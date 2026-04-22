export type TabId = 'garage' | 'market' | 'board';

export interface UIState {
  activeTab: TabId;
  isGarageOpen: boolean;
  boardAnimationStatus: 'idle' | 'running';
}

export interface UIActions {
  setActiveTab: (tab: TabId) => void;
  toggleGarage: () => void;
  setAnimationStatus: (status: 'idle' | 'running') => void;
  openGarage: () => void;
  closeGarage: () => void;
}

export type UISlice = UIState & UIActions;

export const initialUIState: UIState = {
  activeTab: 'board',
  isGarageOpen: false,
  boardAnimationStatus: 'idle',
};
