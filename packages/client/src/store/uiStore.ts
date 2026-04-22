import { create } from 'zustand';

export type ActiveTab = 'board' | 'garage' | 'market' | 'contracts';

interface UiState {
  activeTab: ActiveTab;
  boardAnimationStatus: 'idle' | 'running';
  isActionModalOpen: boolean;
  isWinModalOpen: boolean;
  isCreateRoomModalOpen: boolean;
  isRulesModalOpen: boolean;
  isContractsModalOpen: boolean;
  highlightedCellId: number | null;
}

interface UiActions {
  setActiveTab: (tab: ActiveTab) => void;
  setBoardAnimationStatus: (status: 'idle' | 'running') => void;
  setIsActionModalOpen: (isOpen: boolean) => void;
  setIsWinModalOpen: (isOpen: boolean) => void;
  setIsCreateRoomModalOpen: (isOpen: boolean) => void;
  setIsRulesModalOpen: (isOpen: boolean) => void;
  setIsContractsModalOpen: (isOpen: boolean) => void;
  setHighlightedCellId: (cellId: number | null) => void;
  resetUiState: () => void;
}

const initialUiState: UiState = {
  activeTab: 'board',
  boardAnimationStatus: 'idle',
  isActionModalOpen: false,
  isWinModalOpen: false,
  isCreateRoomModalOpen: false,
  isRulesModalOpen: false,
  isContractsModalOpen: false,
  highlightedCellId: null,
};

export const useUiStore = create<UiState & UiActions>((set) => ({
  ...initialUiState,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setBoardAnimationStatus: (status) => set({ boardAnimationStatus: status }),
  setIsActionModalOpen: (isOpen) => set({ isActionModalOpen: isOpen }),
  setIsWinModalOpen: (isOpen) => set({ isWinModalOpen: isOpen }),
  setIsCreateRoomModalOpen: (isOpen) => set({ isCreateRoomModalOpen: isOpen }),
  setIsRulesModalOpen: (isOpen) => set({ isRulesModalOpen: isOpen }),
  setIsContractsModalOpen: (isOpen) => set({ isContractsModalOpen: isOpen }),
  setHighlightedCellId: (cellId) => set({ highlightedCellId: cellId }),
  resetUiState: () => set(initialUiState),
}));