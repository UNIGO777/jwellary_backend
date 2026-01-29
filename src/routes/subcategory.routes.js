import { Router } from 'express'
import { index, show, create, updateOne, remove } from '../controllers/subCategoryController.js'
import { authAdmin } from '../middlewares/auth.js'

const router = Router()

router.get('/', index)
router.get('/:id', show)
router.post('/', authAdmin, create)
router.put('/:id', authAdmin, updateOne)
router.delete('/:id', authAdmin, remove)

export default router

