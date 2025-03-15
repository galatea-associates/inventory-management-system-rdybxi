import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import FocusTrap from 'focus-trap-react'; // focus-trap-react ^10.1.1

import Button from './Button';
import Typography from './Typography';
import Paper from './Paper';
import { modalStyles } from '../../styles/components';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useKeyPress } from '../../hooks/useKeyPress';
import { flexCenter } from '../../styles/mixins';
import { zIndex } from '../../styles/variables';

/**
 * Interface defining props for the Modal component
 */
export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to call when the modal should close */
  onClose: () => void;
  /** Modal title */
  title: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size: 'small', 'medium', 'large', or 'fullScreen' */
  size?: 'small' | 'medium' | 'large' | 'fullScreen';
  /** Whether the modal should take up the full screen */
  fullScreen?: boolean;
  /** Whether to hide the close button */
  hideCloseButton?: boolean;
  /** Whether to close the modal when the escape key is pressed */
  closeOnEscape?: boolean;
  /** Whether to close the modal when clicking outside of it */
  closeOnOverlayClick?: boolean;
  /** Content for the modal footer */
  footer?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

// Animation keyframes
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const slideOut = keyframes`
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-20px); opacity: 0; }
`;

// Styled components for modal
const ModalOverlay = styled.div<{ isEntering: boolean; isExiting: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: ${zIndex.modal};
  ${flexCenter()};
  animation: ${props => (props.isExiting ? fadeOut : fadeIn)} 300ms ease-in-out;
  pointer-events: ${props => props.isExiting ? 'none' : 'auto'};
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  ${flexCenter()};
  z-index: ${zIndex.modal + 1};
`;

const ModalContent = styled(Paper)<{ 
  size: string; 
  fullScreen: boolean; 
  isEntering: boolean;
  isExiting: boolean;
}>`
  display: flex;
  flex-direction: column;
  max-height: ${props => props.fullScreen ? '100vh' : '90vh'};
  width: ${props => {
    if (props.fullScreen) return '100vw';
    switch (props.size) {
      case 'small': return '400px';
      case 'large': return '800px';
      case 'fullScreen': return '100vw';
      default: return '600px'; // medium
    }
  }};
  max-width: ${props => props.fullScreen ? '100%' : 'calc(100% - 48px)'};
  border-radius: ${props => props.fullScreen ? '0' : '8px'};
  box-shadow: ${props => props.fullScreen ? 'none' : '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)'};
  animation: ${props => (props.isExiting ? slideOut : slideIn)} 300ms ease-in-out;
  
  @media (max-width: 600px) {
    max-width: ${props => props.fullScreen ? '100%' : 'calc(100% - 32px)'};
    margin: ${props => props.fullScreen ? '0' : '16px'};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 1;
`;

const ModalBody = styled.div`
  flex-grow: 1;
  padding: 24px;
  overflow-y: auto;
  min-height: 100px;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 1;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
`;

/**
 * Modal component for the Inventory Management System UI
 * 
 * Provides a customizable modal dialog with various sizes, animations, and accessibility
 * features including keyboard navigation and screen reader support.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  fullScreen = false,
  hideCloseButton = false,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  footer,
  className,
}: ModalProps): JSX.Element | null => {
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay (not its children)
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);
  
  // Handle escape key press
  const isEscapePressed = useKeyPress('Escape');
  useEffect(() => {
    if (isOpen && closeOnEscape && isEscapePressed) {
      onClose();
    }
  }, [isOpen, closeOnEscape, isEscapePressed, onClose]);
  
  // Store active element and lock body scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
  
  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && !isAnimating && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen, isAnimating]);
  
  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setIsEntering(true);
      setIsExiting(false);
    } else if (isAnimating) {
      setIsEntering(false);
      setIsExiting(true);
      
      // Delay removing the modal from DOM until animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setIsExiting(false);
      }, 300); // Match animation duration
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAnimating]);
  
  // Don't render if modal is not open and not animating
  if (!isOpen && !isAnimating) {
    return null;
  }
  
  // Render the modal using React Portal
  return ReactDOM.createPortal(
    <FocusTrap
      focusTrapOptions={{
        escapeDeactivates: false,
        allowOutsideClick: true,
        initialFocus: () => modalRef.current,
        returnFocusOnDeactivate: true,
      }}
    >
      <div className={className}>
        <ModalOverlay
          ref={overlayRef}
          onClick={handleOverlayClick}
          isEntering={isEntering}
          isExiting={isExiting}
          aria-hidden="true"
        >
          <ModalContainer>
            <ModalContent
              ref={modalRef}
              size={size}
              fullScreen={fullScreen}
              isEntering={isEntering}
              isExiting={isExiting}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              tabIndex={-1} // Allows the div to receive focus
            >
              <ModalHeader>
                <Typography variant="h5" id="modal-title">
                  {title}
                </Typography>
                {!hideCloseButton && (
                  <CloseButton
                    onClick={onClose}
                    aria-label="Close modal"
                    type="button"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
                    </svg>
                  </CloseButton>
                )}
              </ModalHeader>
              <ModalBody>
                {children}
              </ModalBody>
              {footer && (
                <ModalFooter>
                  {footer}
                </ModalFooter>
              )}
            </ModalContent>
          </ModalContainer>
        </ModalOverlay>
      </div>
    </FocusTrap>,
    document.body
  );
};

export default Modal;