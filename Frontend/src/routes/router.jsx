import { createBrowserRouter } from 'react-router-dom'
import { MainLayout, AuthLayout, HomePage, ProfilePage, SignUpPage, LogInPage, ForgetPasswordPage, ResetPasswordPage, VerifyEmailPage } from '../pages/index.js'

const   router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout/>,
        children: [
            {
                path: '/',
                element: <HomePage />
            },
            {
                path: '/me',
                element: <ProfilePage />
            },
            {
                path: '/:username',
                element: <ProfilePage />
            },
        ]
    },
    {
        path: '/',
        element: <AuthLayout />,
        children: [
            {
                path: '/signup',
                element: <SignUpPage />
            },{
                path: '/verify-email',
                element: <VerifyEmailPage />
            }
            ,
            {
                path: '/login',
                element: <LogInPage />
            },
            {
                path: '/forgot-password',
                element: <ForgetPasswordPage />
            },
            {
                path: '/reset-password',
                element: <ResetPasswordPage />
            },
            {
                path: '/reset-password/:token',
                element: <ResetPasswordPage />
            }
        ]
    }
])

export default router
