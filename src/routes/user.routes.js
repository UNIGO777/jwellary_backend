import { Router } from 'express'
import { loginInit, loginVerify, logout, me, signupInit, signupVerify, updatePassword } from '../controllers/user.controller.js'
import { authUser } from '../middlewares/auth.js'

const router = Router()

router.post('/signup/init', signupInit)
router.post('/signup/verify', signupVerify)
router.post('/login/init', loginInit)
router.post('/login/verify', loginVerify)
router.post('/logout', authUser, logout)
router.get('/me', authUser, me)
router.patch('/password', authUser, updatePassword)

export default router
