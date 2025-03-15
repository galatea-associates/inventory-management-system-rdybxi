import React, { useCallback, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useSelector, useDispatch } from 'react-redux'; // react-redux ^8.0.5
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material 5.13
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Container from './Container';
import { selectSidebarOpen } from '../../state/ui/uiSelectors';
import { toggleSidebar } from '../../state/ui/uiSlice';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * @interface LayoutProps
 * @description Props for the Layout component
 */
export interface LayoutProps {
  /** Content to be rendered within the layout */
  children: React.ReactNode;
}

/**
 * @styled_component LayoutContainer
 * @description Styled container for the entire layout
 */
const LayoutContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.palette.background.default};
`;

/**
 * @styled_component MainContainer
 * @description Styled container for the main content area including sidebar and content
 */
const MainContainer = styled(Box)`
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  overflow: hidden;
`;

/**
 * @styled_component ContentContainer
 * @description Styled container for the page content
 */
const ContentContainer = styled(Box)<{ sidebarOpen: boolean; isMobile: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: auto;
  transition: margin-left 0.3s ease;
  margin-left: ${({ sidebarOpen, isMobile }) => (sidebarOpen && !isMobile ? '240px' : '64px')};
  width: calc(100% - ${({ sidebarOpen, isMobile }) => (sidebarOpen && !isMobile ? '240px' : '64px')});
  padding: ${({ theme }) => theme.spacing(2)};
  padding-bottom: 0;
`;

/**
 * @styled_component MobileContentContainer
 * @description Styled container for the page content on mobile devices
 */
const MobileContentContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: auto;
  width: 100%;
  padding: ${({ theme }) => theme.spacing(2)};
  padding-bottom: 0;
`;

/**
 * @function Layout
 * @description Main layout component that provides the application structure
 * @param {LayoutProps} props - Props for the Layout component
 * @returns {JSX.Element} Rendered layout component
 */
export const Layout: React.FC<LayoutProps> = React.memo(({ children }) => {
  // LD1: Destructure children from props
  // IE1: Get the current theme using useTheme hook
  const theme = useTheme();

  // IE1: Get the current breakpoint using useBreakpoint hook
  const { isMobile } = useBreakpoint();

  // IE1: Get the sidebar open state from Redux using useSelector and selectSidebarOpen
  const sidebarOpen = useSelector(selectSidebarOpen);

  // IE1: Get the dispatch function using useDispatch
  const dispatch = useDispatch();

  // LD1: Create a memoized handler for toggling the sidebar using useCallback
  const handleToggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  // LD1: Use useEffect to automatically close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      dispatch(toggleSidebar());
    }
  }, [isMobile, sidebarOpen, dispatch]);

  // LD1: Render the LayoutContainer with appropriate styling
  // LD1: Render the Header component with sidebar toggle handler
  // LD1: Render the MainContainer with Sidebar and ContentContainer
  // LD1: Render the Sidebar component with appropriate props
  // LD1: Render the ContentContainer with children and Footer
  // LD1: Apply appropriate styling and spacing between elements
  // LD1: Adjust layout based on screen size and sidebar state for responsive design
  return (
    <LayoutContainer>
      <Header onToggleSidebar={handleToggleSidebar} />
      <MainContainer>
        <Sidebar />
        {isMobile ? (
          <MobileContentContainer>
            {children}
            <Footer />
          </MobileContentContainer>
        ) : (
          <ContentContainer sidebarOpen={sidebarOpen} isMobile={isMobile}>
            {children}
            <Footer />
          </ContentContainer>
        )}
      </MainContainer>
    </LayoutContainer>
  );
});

export interface LayoutProps {
    children: React.ReactNode;
}
export default Layout;