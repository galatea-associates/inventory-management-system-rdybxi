import React from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.10.0
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import Card from '../../components/common/Card';
import { AUTH_ROUTES } from '../../constants/routes';

/**
 * Container for the forgot password page with centered content
 */
const ForgotPasswordContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.palette.background.default};
  padding: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Content container for the forgot password form
 */
const ForgotPasswordContent = styled.div`
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding: ${({ theme }) => theme.spacing(3)};
  box-shadow: ${({ theme }) => theme.shadows[5]};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  background-color: ${({ theme }) => theme.palette.background.paper};
`;

/**
 * Container for the application logo
 */
const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  width: 100%;
`;

/**
 * Application logo image
 */
const Logo = styled.img`
  max-width: 200px;
  height: auto;
`;

/**
 * Forgot password page component that renders the forgot password form and handles password reset request flow
 */
const ForgotPassword: React.FC = () => {
  /**
   * Get navigate function from useNavigate hook for redirection
   */
  const navigate = useNavigate();

  /**
   * Handles successful password reset request by navigating to login page
   */
  const handleRequestSuccess = () => {
    /**
     * Navigate to the login page with a success message query parameter
     */
    navigate(`${AUTH_ROUTES.LOGIN}?resetSuccess=true`);
  };

  /**
   * Render the forgot password page with appropriate layout and styling
   */
  return (
    <ForgotPasswordContainer>
      <ForgotPasswordContent>
        {/* <LogoContainer>
          <Logo src="/logo.png" alt="Inventory Management System" />
        </LogoContainer> */}
        
        {/* Render the ForgotPasswordForm component with necessary props */}
        {/* Pass onSuccess handler to ForgotPasswordForm for redirection after successful request */}
        <ForgotPasswordForm onSuccess={handleRequestSuccess} />
      </ForgotPasswordContent>
    </ForgotPasswordContainer>
  );
};

/**
 * Default export of the ForgotPassword page component
 */
export default ForgotPassword;