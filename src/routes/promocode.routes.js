import { Router } from 'express'
import { create, index, remove, show, updateOne, validate } from '../controllers/promocode.controller.js'
import { authAdmin } from '../middlewares/auth.js'

const router = Router()

router.post('/validate', validate)

router.get('/', authAdmin, index)
router.get('/:id', authAdmin, show)
router.post('/', authAdmin, create)
router.put('/:id', authAdmin, updateOne)
router.delete('/:id', authAdmin, remove)

export default router
