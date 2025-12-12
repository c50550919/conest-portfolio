/**
 * FolderSelectionModal Component Tests
 * Tests for the folder selection modal for saving profiles
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FolderSelectionModal } from '../../../src/components/discovery/FolderSelectionModal';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('FolderSelectionModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectFolder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible', () => {
      const { getByTestId } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      expect(getByTestId('folder-selection-modal')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      expect(getByText('Save to Folder')).toBeTruthy();
    });

    it('should display profile name in subtitle', () => {
      const { getByText } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      expect(getByText('Where would you like to save Sarah?')).toBeTruthy();
    });
  });

  describe('folder options', () => {
    it('should display all folder options', () => {
      const { getByText, getByTestId } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      expect(getByText('Top Choice')).toBeTruthy();
      expect(getByText('Strong Maybe')).toBeTruthy();
      expect(getByText('Considering')).toBeTruthy();
      expect(getByText('Backup')).toBeTruthy();
      expect(getByTestId('folder-top-choice')).toBeTruthy();
      expect(getByTestId('folder-strong-maybe')).toBeTruthy();
      expect(getByTestId('folder-considering')).toBeTruthy();
      expect(getByTestId('folder-backup')).toBeTruthy();
    });
  });

  describe('folder selection', () => {
    it('should call onSelectFolder with "Top Choice" when selected', () => {
      const { getByTestId } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      fireEvent.press(getByTestId('folder-top-choice'));
      expect(mockOnSelectFolder).toHaveBeenCalledWith('Top Choice');
    });

    it('should call onSelectFolder with "Strong Maybe" when selected', () => {
      const { getByTestId } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      fireEvent.press(getByTestId('folder-strong-maybe'));
      expect(mockOnSelectFolder).toHaveBeenCalledWith('Strong Maybe');
    });

    it('should close modal after folder selection', () => {
      const { getByTestId } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      fireEvent.press(getByTestId('folder-top-choice'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel button', () => {
    it('should display cancel button', () => {
      const { getByText } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should call onClose when cancel is pressed', () => {
      const { getByText } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      fireEvent.press(getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onSelectFolder when cancel is pressed', () => {
      const { getByText } = render(
        <FolderSelectionModal
          visible={true}
          onClose={mockOnClose}
          onSelectFolder={mockOnSelectFolder}
          profileName="Sarah"
        />
      );
      fireEvent.press(getByText('Cancel'));
      expect(mockOnSelectFolder).not.toHaveBeenCalled();
    });
  });
});
