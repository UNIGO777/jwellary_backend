import { Router } from 'express'
import { add, list, remove } from '../controllers/cart.controller.js'
import { authUser } from '../middlewares/auth.js'

const router = Router()

router.get('/', authUser, list)
router.post('/', authUser, add)
router.delete('/:productId', authUser, remove)

export default router
