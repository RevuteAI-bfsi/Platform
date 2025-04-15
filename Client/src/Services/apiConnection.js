// const URL = "https://revuteai.onrender.com/api";
const URL = "http://localhost:8000/api";

// LOGIN
export const login = ({ email, password }) => {
  return fetch(`${URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
};

// REGISTER
export const register = (data) => {
  return fetch(`${URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
};

// LOGOUT
export const logout = () => {
  return fetch(`${URL}/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include'
  });
};
