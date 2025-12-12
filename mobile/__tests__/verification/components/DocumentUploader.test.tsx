/**
 * Unit Tests for DocumentUploader Component
 * TDD: These tests MUST FAIL before implementation
 * Task: T015
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { DocumentUploader } from '../../../src/components/verification/DocumentUploader';
import { UploadedDocument } from '../../../src/types/verification';
import * as ImagePicker from 'react-native-image-picker';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

// Mock Alert.alert to capture callbacks
jest.spyOn(Alert, 'alert');

describe('DocumentUploader', () => {
  const createMockDocument = (id: string): UploadedDocument => ({
    id,
    uri: `file://path/to/${id}.pdf`,
    name: `${id}.pdf`,
    size: 1024 * 1024, // 1MB
    type: 'application/pdf',
    uploadStatus: 'pending',
  });

  const defaultProps = {
    documentType: 'pay_stubs' as const,
    documents: [],
    onAddDocument: jest.fn(),
    onRemoveDocument: jest.fn(),
    maxDocuments: 2,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render upload button when no documents', () => {
      const { getByTestId } = render(<DocumentUploader {...defaultProps} testID="uploader" />);

      expect(getByTestId('uploader-add-button')).toBeTruthy();
    });

    it('should show document type label', () => {
      const { getByText } = render(<DocumentUploader {...defaultProps} documentType="pay_stubs" />);

      expect(getByText(/pay stubs/i)).toBeTruthy();
    });

    it('should show max documents hint for pay_stubs', () => {
      const { getByText } = render(
        <DocumentUploader {...defaultProps} documentType="pay_stubs" maxDocuments={2} />
      );

      expect(getByText(/2 documents required/i)).toBeTruthy();
    });

    it('should show max documents hint for employment_letter', () => {
      const { getByText } = render(
        <DocumentUploader {...defaultProps} documentType="employment_letter" maxDocuments={1} />
      );

      expect(getByText(/1 document required/i)).toBeTruthy();
    });

    it('should render uploaded documents', () => {
      const documents = [createMockDocument('doc-1'), createMockDocument('doc-2')];

      const { getByText } = render(<DocumentUploader {...defaultProps} documents={documents} />);

      expect(getByText('doc-1.pdf')).toBeTruthy();
      expect(getByText('doc-2.pdf')).toBeTruthy();
    });

    it('should show document size', () => {
      const documents = [createMockDocument('doc-1')];

      const { getByText } = render(<DocumentUploader {...defaultProps} documents={documents} />);

      // formatFileSize returns "1.0 MB" for 1024*1024 bytes
      expect(getByText(/1\.0 MB/i)).toBeTruthy();
    });

    it('should show upload status indicator', () => {
      const documents = [
        {
          ...createMockDocument('doc-1'),
          uploadStatus: 'uploading' as const,
        },
      ];

      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} documents={documents} testID="uploader" />
      );

      expect(getByTestId('uploader-doc-0-uploading')).toBeTruthy();
    });
  });

  describe('document limits', () => {
    it('should hide add button when max documents reached', () => {
      const documents = [createMockDocument('doc-1'), createMockDocument('doc-2')];

      const { queryByTestId } = render(
        <DocumentUploader
          {...defaultProps}
          documents={documents}
          maxDocuments={2}
          testID="uploader"
        />
      );

      expect(queryByTestId('uploader-add-button')).toBeNull();
    });

    it('should show remaining count when partially filled', () => {
      const documents = [createMockDocument('doc-1')];

      const { getByText } = render(
        <DocumentUploader {...defaultProps} documents={documents} maxDocuments={2} />
      );

      expect(getByText(/1 more needed/i)).toBeTruthy();
    });
  });

  describe('adding documents', () => {
    it('should open image picker on add button press', async () => {
      const { getByTestId } = render(<DocumentUploader {...defaultProps} testID="uploader" />);

      fireEvent.press(getByTestId('uploader-add-button'));

      expect(ImagePicker.launchImageLibrary).toHaveBeenCalled();
    });

    it('should call onAddDocument with selected file', async () => {
      const mockAsset = {
        uri: 'file://selected.pdf',
        fileName: 'selected.pdf',
        fileSize: 1024,
        type: 'application/pdf',
      };

      (ImagePicker.launchImageLibrary as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      const onAddDocument = jest.fn();
      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} onAddDocument={onAddDocument} testID="uploader" />
      );

      fireEvent.press(getByTestId('uploader-add-button'));

      await waitFor(() => {
        expect(onAddDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            uri: 'file://selected.pdf',
            name: 'selected.pdf',
          })
        );
      });
    });

    it('should reject files larger than maxSizeBytes', async () => {
      const mockAsset = {
        uri: 'file://large.pdf',
        fileName: 'large.pdf',
        fileSize: 10 * 1024 * 1024, // 10MB
        type: 'application/pdf',
      };

      (ImagePicker.launchImageLibrary as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      const onAddDocument = jest.fn();
      const { getByTestId, getByText } = render(
        <DocumentUploader
          {...defaultProps}
          onAddDocument={onAddDocument}
          maxSizeBytes={5 * 1024 * 1024}
          testID="uploader"
        />
      );

      fireEvent.press(getByTestId('uploader-add-button'));

      await waitFor(() => {
        expect(onAddDocument).not.toHaveBeenCalled();
        expect(getByText(/too large/i)).toBeTruthy();
      });
    });

    it('should only accept valid file types', async () => {
      const mockAsset = {
        uri: 'file://document.doc',
        fileName: 'document.doc',
        fileSize: 1024,
        type: 'application/msword',
      };

      (ImagePicker.launchImageLibrary as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      const onAddDocument = jest.fn();
      const { getByTestId, getByText } = render(
        <DocumentUploader {...defaultProps} onAddDocument={onAddDocument} testID="uploader" />
      );

      fireEvent.press(getByTestId('uploader-add-button'));

      await waitFor(() => {
        expect(onAddDocument).not.toHaveBeenCalled();
        expect(getByText(/invalid file type/i)).toBeTruthy();
      });
    });
  });

  describe('removing documents', () => {
    it('should show remove button for each document', () => {
      const documents = [createMockDocument('doc-1')];

      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} documents={documents} testID="uploader" />
      );

      expect(getByTestId('uploader-doc-0-remove')).toBeTruthy();
    });

    it('should call onRemoveDocument when remove pressed and confirmed', () => {
      const documents = [createMockDocument('doc-1')];
      const onRemoveDocument = jest.fn();

      const { getByTestId } = render(
        <DocumentUploader
          {...defaultProps}
          documents={documents}
          onRemoveDocument={onRemoveDocument}
          testID="uploader"
        />
      );

      fireEvent.press(getByTestId('uploader-doc-0-remove'));

      // Component shows confirmation Alert - simulate pressing "Remove" button
      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Document',
        'Are you sure you want to remove this document?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Remove', style: 'destructive' }),
        ])
      );

      // Get the "Remove" button's onPress callback and call it
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');
      removeButton.onPress();

      expect(onRemoveDocument).toHaveBeenCalledWith('doc-1');
    });

    it('should not show remove button when disabled', () => {
      const documents = [createMockDocument('doc-1')];

      const { queryByTestId } = render(
        <DocumentUploader
          {...defaultProps}
          documents={documents}
          disabled={true}
          testID="uploader"
        />
      );

      expect(queryByTestId('uploader-doc-0-remove')).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('should disable add button when disabled', () => {
      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} disabled={true} testID="uploader" />
      );

      const addButton = getByTestId('uploader-add-button');
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should not call onAddDocument when disabled', () => {
      const onAddDocument = jest.fn();
      const { getByTestId } = render(
        <DocumentUploader
          {...defaultProps}
          onAddDocument={onAddDocument}
          disabled={true}
          testID="uploader"
        />
      );

      fireEvent.press(getByTestId('uploader-add-button'));

      expect(ImagePicker.launchImageLibrary).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible add button', () => {
      const { getByTestId } = render(<DocumentUploader {...defaultProps} testID="uploader" />);

      const addButton = getByTestId('uploader-add-button');
      expect(addButton.props.accessibilityLabel).toContain('Add document');
    });

    it('should have accessible remove button', () => {
      const documents = [createMockDocument('doc-1')];

      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} documents={documents} testID="uploader" />
      );

      const removeButton = getByTestId('uploader-doc-0-remove');
      expect(removeButton.props.accessibilityLabel).toContain('Remove');
    });

    it('should announce upload progress', () => {
      const documents = [
        {
          ...createMockDocument('doc-1'),
          uploadStatus: 'uploading' as const,
        },
      ];

      const { getByTestId } = render(
        <DocumentUploader {...defaultProps} documents={documents} testID="uploader" />
      );

      const doc = getByTestId('uploader-doc-0');
      expect(doc.props.accessibilityLabel).toContain('uploading');
    });
  });
});
