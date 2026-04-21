export type TabId = 'garage' | 'market' | 'board';

export interface UIState {
  activeTab: TabId;
}

export interface UIActions {
  setActiveTab: (tab: TabId) => void;
}

export type UISlice = UIState & UIActions;

export const initialUIState: UIState = {
  activeTab: 'board',
};
