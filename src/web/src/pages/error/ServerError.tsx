import React from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // @mui/material 5.13
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
  marginBottom: ${({ theme }) => theme.spacing(2)};
`;

/**
 * @styled_component ButtonContainer
 * @description Styled container for action buttons
 */
const ButtonContainer = styled(Box)`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  marginTop: ${({ theme }) => theme.spacing(2)};
  justify-content: center;
`;

/**
 * @function ServerError
 * @description Component that renders a 500 Server Error page
 * @returns {JSX.Element} Rendered ServerError page component
 */
const ServerError: React.FC = React.memo(() => {
  // LD1: Get the navigate function from useNavigate hook
  const navigate = useNavigate();

  // LD1: Create a handler function for navigating to the dashboard
  const handleGoToDashboard = () => {
    navigate(ROUTES.DASHBOARD);
  };

  // LD1: Return a Layout component as the page container
  return (
    <Layout>
      {/* LD1: Render a Page component with title '500 - Server Error' */}
      <Page title="500 - Server Error">
        {/* LD1: Apply appropriate styling for centered content and spacing */}
        <ErrorContainer>
          {/* LD1: Display an error code and message explaining that a server error occurred */}
          <ErrorCode variant="h1">500</ErrorCode>
          <Typography variant="h5">Oops! Something went wrong on our server.</Typography>
          <Typography variant="body1">We're working on it and will get it fixed as soon as possible.</Typography>
          {/* LD1: Show a Button component to navigate back to the dashboard */}
          <ButtonContainer>
            <Button variant="contained" color="primary" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          </ButtonContainer>
        </ErrorContainer>
      </Page>
    </Layout>
  );
});

export default ServerError;