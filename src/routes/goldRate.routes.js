import { Router } from 'express'
import { create, index, remove, show, updateOne } from '../controllers/goldRate.controller.js'
import { authAdmin } from '../middlewares/auth.js'

const router = Router()

router.get('/', authAdmin, index)
router.get('/:id', authAdmin, show)
router.post('/', authAdmin, create)
router.put('/:id', authAdmin, updateOne)
router.delete('/:id', authAdmin, remove)

export default router
