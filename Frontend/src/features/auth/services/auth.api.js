// import axios from "axios"



// const api = axios.create({
//     baseURL: "http://localhost:3000",
//     withCredentials: true
// })
// // reginstertion 
// export async function register({ username, email, password }) {

//     try {
//         const response = await api.post('/api/auth/register', {
//             username, email, password
//         })

//         return response.data

//     } catch (err) {

//         console.log(err)

//     }

// }

// // login 

// export async function login({email, password}) {
//   try {
//     const response = await api.post("/api/auth/login", {
//      email, password
//     })
//     return response.data
//   }
//   catch (err) {
//     console.log(err)
//   }
// }


// //logout
// export async function logout() {
//     try {

//         const response = await api.get("/api/auth/logout")

//         return response.data

//     } catch (err) {
//         console.log(err)

//     }
// }

// // get-me

// export async function getMe() {

//     try {

//         const response = await api.get("/api/auth/get-me")

//         return response.data

//     } catch (err) {
//         console.log(err)
//     }

// }
import axios from "axios"


// In local dev this defaults to your Express server on port 3000.
// In production, set VITE_API_URL in Vercel's environment variables to
// your deployed Render backend URL (e.g. https://your-app.onrender.com).
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
})
// registration
export async function register({ username, email, password }) {

    const response = await api.post('/api/auth/register', {
        username, email, password
    })

    return response.data

}

// login

export async function login({ email, password }) {

    const response = await api.post("/api/auth/login", {
        email, password
    })

    return response.data

}


//logout
export async function logout() {

    const response = await api.get("/api/auth/logout")

    return response.data

}

// get-me

export async function getMe() {

    const response = await api.get("/api/auth/get-me")

    return response.data

}