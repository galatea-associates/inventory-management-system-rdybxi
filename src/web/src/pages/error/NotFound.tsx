import React from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // Material-UI Box component for layout container version 5.13
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.10.0
import Layout from '../../components/layout/Layout'; // Import Layout component for consistent page structure
import Page from '../../components/layout/Page'; // Import Page component for standard page layout
import Typography from '../../components/common/Typography'; // Import Typography component for text styling
import Button from '../../components/common/Button'; // Import Button component for navigation actions
import { ROUTES } from '../../constants/routes'; // Import route constants for navigation

/**
 * @styled_component ErrorContainer
 * @description Styled container for the error content
 */
const ErrorContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing(4)};
  gap: ${({ theme }) => theme.spacing(3)};
`;

/**
 * @styled_component ErrorCode
 * @description Styled component for the error code display
 */
const ErrorCode = styled(Typography)`
  font-size: 6rem;
  font-weight: bold;
  color: ${({ theme }) => theme.palette.error.main};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

/**
 * @styled_component ButtonContainer
 * @description Styled container for action buttons
 */
const ButtonContainer = styled(Box)`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(2)};
  justify-content: center;
`;

/**
 * @function NotFound
 * @description Component that renders a 404 Not Found error page
 * @returns {JSX.Element} Rendered NotFound page component
 */
export const NotFound: React.FC = React.memo(() => {
  // IE1: Get the navigate function from useNavigate hook
  const navigate = useNavigate();

  /**
   * @function handleGoBackToDashboard
   * @description Creates a handler function for navigating to the dashboard
   */
  const handleGoBackToDashboard = () => {
    navigate(ROUTES.DASHBOARD);
  };

  // LD1: Return a Layout component as the page container
  // LD1: Render a Page component with title '404 - Page Not Found'
  // LD1: Display an error code and message explaining that the requested page could not be found
  // LD1: Show a Button component to navigate back to the dashboard
  // LD1: Apply appropriate styling for centered content and spacing
  return (
    <Layout>
      <Page title="404 - Page Not Found">
        <ErrorContainer>
          <ErrorCode variant="h1">404</ErrorCode>
          <Typography variant="h5">
            Oops! The page you are looking for could not be found.
          </Typography>
          <ButtonContainer>
            <Button variant="contained" onClick={handleGoBackToDashboard}>
              Go Back to Dashboard
            </Button>
          </ButtonContainer>
        </ErrorContainer>
      </Page>
    </Layout>
  );
});

export default NotFound;