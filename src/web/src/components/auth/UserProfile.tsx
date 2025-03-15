import React, { useState, useEffect, useCallback } from 'react'; // react ^18.0.0
import styled from '@emotion/styled'; // @emotion/styled ^11.0.0
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Input from '../common/Input';
import FormControl from '../common/FormControl';
import Typography from '../common/Typography';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import ChangePasswordForm from './ChangePasswordForm';
import { useAuth } from '../../hooks/useAuth';
import { UserProfile as UserProfileType, getUserProfile, updateUserProfile } from '../../api/user';
import { validateRequired, validateEmail, validateForm } from '../../utils/validation';
import { Edit, Save, Cancel, Security } from '@mui/icons-material'; // @mui/icons-material 5.13
import { Tabs, Tab } from '@mui/material'; // @mui/material 5.13

/**
 * Interface defining the props for the UserProfile component
 */
interface UserProfileProps {
  className?: string;
}

/**
 * Interface defining the form data for the profile form
 */
interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  jobTitle: string;
}

/**
 * Interface defining the error state for the profile form
 */
interface ProfileFormErrors {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  form?: string | null;
}

/**
 * Styled container for the profile component
 */
const ProfileContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

/**
 * Styled header section of the profile with avatar and name
 */
const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

/**
 * Styled content section of the profile
 */
const ProfileContent = styled.div`
  width: 100%;
`;

/**
 * Styled form for editing profile information
 */
const ProfileForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

/**
 * Styled row in the profile form for layout
 */
const FormRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  width: 100%;
  flex-wrap: wrap;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

/**
 * Styled container for form action buttons
 */
const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

/**
 * Styled container for tab content
 */
const TabContent = styled.div`
  padding: 24px 0;
`;

/**
 * Styled section for security-related settings
 */
const SecuritySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

/**
 * Styled container for MFA status display
 */
const MfaStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/**
 * Main component for displaying and editing user profile information
 */
const UserProfile: React.FC<UserProfileProps> = React.memo(({ className }) => {
  // Initialize state for profile data, loading state, error state, edit mode, and active tab
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});

  // Get current user data from useAuth hook
  const { user } = useAuth();

  /**
   * Fetches the user profile data from the API
   */
  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await getUserProfile();
      setProfile({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phoneNumber: userProfile.phoneNumber,
        department: userProfile.department,
        jobTitle: userProfile.jobTitle,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile data.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handles tab change to switch between profile sections
   * @param event - The tab change event
   * @param newValue - The new tab index
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  /**
   * Handles edit mode toggle to enable/disable form editing
   */
  const handleEditModeToggle = () => {
    setEditMode(!editMode);
    setSuccessMessage(null);
    setFormErrors({});
  };

  /**
   * Handles form field changes to update profile state
   * @param event - The input change event
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    } as ProfileFormData));
  };

  /**
   * Validates form fields before submission
   */
  const validateProfileForm = useCallback(() => {
    const errors: ProfileFormErrors = {};
    if (!profile) return false;

    errors.firstName = validateRequired(profile.firstName, 'First Name');
    errors.lastName = validateRequired(profile.lastName, 'Last Name');
    errors.email = validateEmail(profile.email, 'Email');

    setFormErrors(errors);

    return !Object.values(errors).some((error) => error);
  }, [profile]);

  /**
   * Handles form submission to update user profile
   * @param event - The form submit event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    if (!validateProfileForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateUserProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        department: profile.department,
        jobTitle: profile.jobTitle,
      });
      setSuccessMessage('Profile updated successfully!');
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return (
    <ProfileContainer className={className}>
      {loading && <Spinner />}
      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
      <ProfileHeader>
        <Avatar
          src={user?.imageUrl}
          alt={`${user?.firstName} ${user?.lastName}`}
          size="large"
        />
        <Typography variant="h5">
          {user?.firstName} {user?.lastName}
        </Typography>
      </ProfileHeader>
      <Card>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="profile tabs"
        >
          <Tab label="Personal Info" />
          <Tab label="Security" icon={<Security />} iconPosition="start" />
        </Tabs>
        <ProfileContent>
          {activeTab === 0 && (
            <TabContent>
              {profile ? (
                <ProfileForm onSubmit={handleSubmit}>
                  <FormRow>
                    <FormControl error={!!formErrors.firstName}>
                      <Input
                        label="First Name"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleChange}
                        disabled={!editMode}
                        required
                        error={formErrors.firstName}
                      />
                    </FormControl>
                    <FormControl error={!!formErrors.lastName}>
                      <Input
                        label="Last Name"
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleChange}
                        disabled={!editMode}
                        required
                        error={formErrors.lastName}
                      />
                    </FormControl>
                  </FormRow>
                  <FormControl error={!!formErrors.email}>
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleChange}
                      disabled={!editMode}
                      required
                      error={formErrors.email}
                    />
                  </FormControl>
                  <FormRow>
                    <FormControl>
                      <Input
                        label="Phone Number"
                        name="phoneNumber"
                        value={profile.phoneNumber}
                        onChange={handleChange}
                        disabled={!editMode}
                      />
                    </FormControl>
                    <FormControl>
                      <Input
                        label="Department"
                        name="department"
                        value={profile.department}
                        onChange={handleChange}
                        disabled={!editMode}
                      />
                    </FormControl>
                  </FormRow>
                  <FormControl>
                    <Input
                      label="Job Title"
                      name="jobTitle"
                      value={profile.jobTitle}
                      onChange={handleChange}
                      disabled={!editMode}
                    />
                  </FormControl>
                  <FormActions>
                    {editMode ? (
                      <>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={loading}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() => {
                            setEditMode(false);
                            fetchUserProfile();
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={handleEditModeToggle}
                        disabled={loading}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </FormActions>
                </ProfileForm>
              ) : (
                <Typography>Loading profile...</Typography>
              )}
            </TabContent>
          )}
          {activeTab === 1 && (
            <TabContent>
              <SecuritySection>
                <ChangePasswordForm onSuccess={() => {}} onCancel={() => setActiveTab(0)} />
              </SecuritySection>
            </TabContent>
          )}
        </ProfileContent>
      </Card>
    </ProfileContainer>
  );
});

UserProfile.displayName = 'UserProfile';

export default UserProfile;