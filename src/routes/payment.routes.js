import { Router } from 'express'
import { create, razorpayCreateOrder, razorpayVerify, setStatus, show } from '../controllers/payment.controller.js'
import { authUser } from '../middlewares/auth.js'

const router = Router()

router.post('/razorpay/order', authUser, razorpayCreateOrder)
router.post('/razorpay/verify', authUser, razorpayVerify)
router.post('/', authUser, create)
router.get('/:id', authUser, show)
router.patch('/:id/status', authUser, setStatus)

export default router
