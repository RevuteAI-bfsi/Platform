import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './ProfilePage.css'

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
    fetch(`http://localhost:8000/api/profile/updateProfileInfo`, {
      method: 'PUT',
      body: formData
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Profile update failed')
        }
        setIsEditing(false)
        fetch(`http://localhost:8000/api/profile/profileFetchUser/${userId}`)
          .then((resp) => resp.json())
          .then((data) => {
            setUserData({
              username: data.username,
              email: data.email,
              phone: data.phone || '',
              profileImage: data.profileImage || ''
            })
          })
          .catch((err) => console.error(err))
      })
      .catch((err) => {
        setErrorMessage(err.message)
        console.error(err)
      })
  }

  const updatePassword = () => {
    fetch(`http://localhost:8000/api/profile/updatePassword/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Password update failed')
        }
        alert('Password updated successfully')
      })
      .catch((err) => {
        setErrorMessage(err.message)
        console.error(err)
      })
  }

  useEffect(() => {
    fetch(`http://localhost:8000/api/profile/profileFetchUser/${userId}`)
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
    <div className="profile-page-container">
      <div className="profile-page-content">
        <h1 className="profile-Info-title">Profile Information</h1>
        <div className="profile-image-section">
          <div className="profile-upload-section">
            <div className="profile-image-wrapper">
              {userData.profileImage ? (
                <img src={userData.profileImage} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-placeholder">No Image</div>
              )}
            </div>
            {isEditing && (
              <input type="file" className="profile-input" onChange={handleImageChange} />
            )}
          </div>
          <div className="UserName-section">{userData.username}</div>
        </div>
        <div className="profile-elements">
          <div className="profile-userInput">
            <div className="profile-field">
              <label className="profile-label">Email</label>
              <input type="text" name="email" className="profile-input view-mode" value={userData.email} disabled />
            </div>
            <div className="profile-field">
              <label className="profile-label">Phone</label>
              <input type="text" name="phone" className="profile-input" value={userData.phone} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="profile-field">
              {isEditing ? (
                <button className="EditProfileInfo" onClick={updateProfile}>
                  Save
                </button>
              ) : (
                <button className="EditProfileInfo" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="profile-userBio">
            <div className="ChanepasswordContainer">
              <h2 className="password-title">Change Password</h2>
              <div className="password-fields">
                <input type="password" name="oldPassword" className="profile-input" placeholder="Old Password" value={passwordData.oldPassword} onChange={handlePasswordChange} />
                <input type="password" name="newPassword" className="profile-input" placeholder="New Password" value={passwordData.newPassword} onChange={handlePasswordChange} />
                <input type="password" name="confirmNewPassword" className="profile-input" placeholder="Confirm New Password" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} />
              </div>
              <button className="profile-button" onClick={updatePassword}>
                Update Password
              </button>
            </div>
          </div>
        </div>
        {errorMessage && (
          <p className="error-message" style={{ color: '#1E2330', fontFamily: 'Poppins' }}>
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
