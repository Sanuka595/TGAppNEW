import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ActiveTab = 'board' | 'garage' | 'market';

interface UiState {
  activeTab: ActiveTab;
  isGarageOpen: boolean;
  boardAnimationStatus: 'idle' | 'running';
  isActionModalOpen: boolean;
  isWinModalOpen: boolean;
  isCreateRoomModalOpen: boolean;
  isRulesModalOpen: boolean;
  isContractsModalOpen: boolean;
  highlightedCellId: number | null;
  theme: 'light' | 'dark';
}

interface UiActions {
  setActiveTab: (tab: ActiveTab) => void;
  openGarage: () => void;
  closeGarage: () => void;
  toggleGarage: () => void;
  setBoardAnimationStatus: (status: 'idle' | 'running') => void;
  setIsActionModalOpen: (isOpen: boolean) => void;
  setIsWinModalOpen: (isOpen: boolean) => void;
  setIsCreateRoomModalOpen: (isOpen: boolean) => void;
  setIsRulesModalOpen: (isOpen: boolean) => void;
  setIsContractsModalOpen: (isOpen: boolean) => void;
  setHighlightedCellId: (cellId: number | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  closeTopUiLayer: () => boolean;
  resetUiState: () => void;
}

const initialUiState: UiState = {
  activeTab: 'board',
  isGarageOpen: false,
  boardAnimationStatus: 'idle',
  isActionModalOpen: false,
  isWinModalOpen: false,
  isCreateRoomModalOpen: false,
  isRulesModalOpen: false,
  isContractsModalOpen: false,
  highlightedCellId: null,
  theme: 'dark',
};

export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
  ...initialUiState,
  setActiveTab: (tab) => set({ activeTab: tab, isGarageOpen: tab === 'garage' }),
  openGarage: () => set({ isGarageOpen: true, activeTab: 'garage' }),
  closeGarage: () => set((state) => ({
    isGarageOpen: false,
    activeTab: state.activeTab === 'garage' ? 'board' : state.activeTab,
  })),
  toggleGarage: () => set((state) => {
    const isGarageOpen = !state.isGarageOpen;
    return {
      isGarageOpen,
      activeTab: isGarageOpen ? 'garage' : 'board',
    };
  }),
  setBoardAnimationStatus: (status) => set({ boardAnimationStatus: status }),
  setIsActionModalOpen: (isOpen) => set({ isActionModalOpen: isOpen }),
  setIsWinModalOpen: (isOpen) => set({ isWinModalOpen: isOpen }),
  setIsCreateRoomModalOpen: (isOpen) => set({ isCreateRoomModalOpen: isOpen }),
  setIsRulesModalOpen: (isOpen) => set({ isRulesModalOpen: isOpen }),
  setIsContractsModalOpen: (isOpen) => set({ isContractsModalOpen: isOpen }),
  setHighlightedCellId: (cellId) => set({ highlightedCellId: cellId }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  closeTopUiLayer: () => {
    let isHandled = false;
    set((state) => {
      if (state.isActionModalOpen) {
        isHandled = true;
        return { isActionModalOpen: false };
      }
      if (state.isWinModalOpen) {
        isHandled = true;
        return { isWinModalOpen: false };
      }
      if (state.isCreateRoomModalOpen) {
        isHandled = true;
        return { isCreateRoomModalOpen: false };
      }
      if (state.isRulesModalOpen) {
        isHandled = true;
        return { isRulesModalOpen: false };
      }
      if (state.isContractsModalOpen) {
        isHandled = true;
        return { isContractsModalOpen: false };
      }
      if (state.isGarageOpen) {
        isHandled = true;
        return {
          isGarageOpen: false,
          activeTab: state.activeTab === 'garage' ? 'board' : state.activeTab,
        };
      }
      if (state.activeTab !== 'board') {
        isHandled = true;
        return { activeTab: 'board', isGarageOpen: false };
      }
      return state;
    });
    return isHandled;
  },
  resetUiState: () => set(initialUiState),
    }),
    {
      name: 'perekup-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
