import React, { useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom ^6.10.0
import LoginForm from '../../components/auth/LoginForm';
import Card from '../../components/common/Card';
import { useAuthContext } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';

/**
 * Styled container for the login page with centered content
 */
const LoginContainer = styled.div`
  display: flex; /* Display flex for centering content */
  flex-direction: column; /* Flex direction column for vertical layout */
  align-items: center; /* Align items center for horizontal centering */
  justify-content: center; /* Justify content center for vertical centering */
  min-height: 100vh; /* Min-height 100vh to fill the viewport */
  background-color: #f0f2f5; /* Background color from theme */
  padding: 20px; /* Padding for spacing */
`;

/**
 * Content container for the login form
 */
const LoginContent = styled.div`
  width: 100%; /* Width 100% with max-width constraint */
  max-width: 400px;
  margin: auto; /* Margin auto for centering */
  padding: 20px; /* Padding for internal spacing */
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); /* Box shadow for elevation */
  border-radius: 8px; /* Border radius for rounded corners */
  background-color: #fff; /* Background color from theme */
`;

/**
 * Container for the application logo
 */
const LogoContainer = styled.div`
  text-align: center; /* Text align center for centering */
  margin-bottom: 20px; /* Margin bottom for spacing */
  width: 100%; /* Width 100% for full width */
`;

/**
 * Application logo image
 */
const Logo = styled.img`
  max-width: 150px; /* Max width constraint */
  height: auto; /* Height auto for proper scaling */
`;

/**
 * Login page component that renders the login form and handles authentication flow
 */
const Login: React.FC = () => {
  // LD1: Get authentication state and functions from useAuthContext hook
  const { isAuthenticated, login } = useAuthContext();

  // LD1: Get navigate function from useNavigate hook for redirection
  const navigate = useNavigate();

  // LD1: Get location object from useLocation hook to access query parameters
  const location = useLocation();

  // LD1: Extract redirectUrl from query parameters if present
  const redirectUrl = new URLSearchParams(location.search).get('redirectUrl') || ROUTES.DASHBOARD;

  // LD1: Use useEffect to redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // LD1: Handle successful login by navigating to dashboard or specified redirect URL
  const handleLoginSuccess = () => {
    navigate(redirectUrl);
  };

  // LD1: Render the login page with appropriate layout and styling
  return (
    <LoginContainer>
      <LoginContent>
        {/* LD1: Render the application logo */}
        <LogoContainer>
          <Logo src="/logo.png" alt="Inventory Management System Logo" />
        </LogoContainer>

        {/* LD1: Render the LoginForm component with necessary props */}
        {/* LD1: Pass onLoginSuccess handler to LoginForm for redirection after successful login */}
        <LoginForm onLoginSuccess={handleLoginSuccess} redirectUrl={redirectUrl} />
      </LoginContent>
    </LoginContainer>
  );
};

// LD1: Export default of the Login page component
export default Login;