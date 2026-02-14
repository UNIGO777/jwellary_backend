import { Router } from 'express'
import { analytics, deleteUser, loginInit, loginVerify, me, setUserBlocked, usersIndex } from '../controllers/admin.controller.js'
import { authAdmin } from '../middlewares/auth.js'

const router = Router()

router.post('/login/init', loginInit)
router.post('/login/verify', loginVerify)
router.get('/me', authAdmin, me)
router.get('/analytics', authAdmin, analytics)
router.get('/users', authAdmin, usersIndex)
router.patch('/users/:id/block', authAdmin, setUserBlocked)
router.delete('/users/:id', authAdmin, deleteUser)

export default router

