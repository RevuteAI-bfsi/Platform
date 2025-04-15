import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './ProfilePage.css'

const LocalURL = "http://localhost:8000/api"

const ProfilePage = () => {
  const { userId } = useParams()
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    phone: '',
    profileImage: ''
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleInputChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const handleImageChange = (e) => {
    setProfileImage(e.target.files[0])
  }

  const updateProfile = () => {
    const formData = new FormData()
    formData.append('phone', userData.phone)
    if (profileImage) {
      formData.append('profileImage', profileImage)
    }
    formData.append('username', userData.username)
    formData.append('email', userData.email)
    formData.append('userId', userId)

    // Log the form data contents for debugging
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1])
    }

    fetch(`${LocalURL}/profile/updateProfileInfo`, {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Profile update failed')
        }
        setIsEditing(false)
        setErrorMessage('') // Clear any previous error messages
        
        // Refresh user data after successful update
        return fetch(`${LocalURL}/profile/profileFetchUser`, {
          credentials: 'include'
        })
      })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error('Failed to fetch updated profile')
        }
        return resp.json()
      })
      .then((data) => {
        setUserData({
          username: data.username,
          email: data.email,
          phone: data.phone || '',
          profileImage: data.profileImage || ''
        })
        setErrorMessage('') // Clear any previous error messages
      })
      .catch((err) => {
        setErrorMessage(err.message || 'An error occurred while updating profile')
        console.error('Profile update error:', err)
      })
  }

  const updatePassword = () => {
    fetch(`${LocalURL}/profile/updatePassword`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData),
      credentials: 'include'
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Password update failed')
        }
        alert('Password updated successfully')
        // Clear password fields after successful update
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        })
      })
      .catch((err) => {
        setErrorMessage(err.message)
        console.error('Password update error:', err)
      })
  }

  useEffect(() => {
    fetch(`http://localhost:8000/api/profile/profileFetchUser`, {
      credentials: 'include'
    })
      .then((response) => response.json())
      .then((data) => {
        setUserData({
          username: data.username,
          email: data.email,
          phone: data.phone || '',
          profileImage: data.profileImage || ''
        })
      })
      .catch((err) => console.error(err))
  }, [userId])

  return (
    <div className="profilePage-container">
      <div className="profilePage-wrapper">
        <div className="profilePage-header">
          <h1 className="profilePage-title">Profile Settings</h1>
          <p className="profilePage-subtitle">Manage your account information and security</p>
        </div>

        <div className="profilePage-content">
          <div className="profilePage-section">
            <div className="profilePage-section-header">
              <h2 className="profilePage-section-title">Profile Information</h2>
            </div>
            
            <div className="profilePage-profile-section">
              <div className="profilePage-image-container">
                <div className="profilePage-image-wrapper">
                  {userData.profileImage ? (
                    <img src={userData.profileImage} alt="Profile" className="profilePage-image" />
                  ) : (
                    <div className="profilePage-image-placeholder">
                      <span className="profilePage-image-placeholder-text">No Image</span>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="profilePage-image-upload">
                    <input 
                      type="file" 
                      id="profile-image-input"
                      className="profilePage-file-input" 
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                    <label htmlFor="profile-image-input" className="profilePage-upload-label">
                      Change Photo
                    </label>
                  </div>
                )}
              </div>

              <div className="profilePage-info-container">
                <div className="profilePage-info-group">
                  <label className="profilePage-label">Username</label>
                  <div className="profilePage-username">{userData.username}</div>
                </div>

                <div className="profilePage-info-group">
                  <label className="profilePage-label">Email</label>
                  <input 
                    type="text" 
                    name="email" 
                    className="profilePage-input" 
                    value={userData.email} 
                    disabled 
                  />
                </div>

                <div className="profilePage-info-group">
                  <label className="profilePage-label">Phone</label>
                  <input 
                    type="text" 
                    name="phone" 
                    className="profilePage-input" 
                    value={userData.phone} 
                    onChange={handleInputChange} 
                    disabled={!isEditing} 
                  />
                </div>

                <div className="profilePage-actions">
                  {isEditing ? (
                    <button className="profilePage-button profilePage-button-primary" onClick={updateProfile}>
                      Save Changes
                    </button>
                  ) : (
                    <button className="profilePage-button profilePage-button-secondary" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profilePage-section">
            <div className="profilePage-section-header">
              <h2 className="profilePage-section-title">Security Settings</h2>
            </div>
            
            <div className="profilePage-security-section">
              <div className="profilePage-password-container">
                <div className="profilePage-info-group">
                  <label className="profilePage-label">Current Password</label>
                  <input 
                    type="password" 
                    name="oldPassword" 
                    className="profilePage-input" 
                    placeholder="Enter your current password" 
                    value={passwordData.oldPassword} 
                    onChange={handlePasswordChange} 
                  />
                </div>

                <div className="profilePage-info-group">
                  <label className="profilePage-label">New Password</label>
                  <input 
                    type="password" 
                    name="newPassword" 
                    className="profilePage-input" 
                    placeholder="Enter your new password" 
                    value={passwordData.newPassword} 
                    onChange={handlePasswordChange} 
                  />
                </div>

                <div className="profilePage-info-group">
                  <label className="profilePage-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    name="confirmNewPassword" 
                    className="profilePage-input" 
                    placeholder="Confirm your new password" 
                    value={passwordData.confirmNewPassword} 
                    onChange={handlePasswordChange} 
                  />
                </div>

                <div className="profilePage-actions">
                  <button className="profilePage-button profilePage-button-primary" onClick={updatePassword}>
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="profilePage-error">
            <p className="profilePage-error-message">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
