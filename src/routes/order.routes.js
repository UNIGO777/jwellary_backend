import { Router } from 'express'
import { adminIndex, create, index, setStatus, show } from '../controllers/order.controller.js'
import { authAdmin, authUser } from '../middlewares/auth.js'

const router = Router()

router.get('/admin', authAdmin, adminIndex)
router.get('/', authUser, index)
router.get('/:id', authUser, show)
router.post('/', authUser, create)

router.patch('/:id/status', authAdmin, setStatus)

export default router
