import { Router } from 'express'
import { index, show, create, updateOne, remove, materialTypes, reviewsIndex, reviewsUpsert } from '../controllers/productController.js'
import { authAdmin, authUser } from '../middlewares/auth.js'

const router = Router()

router.get('/meta/material-types', materialTypes)
router.get('/', index)
router.get('/:id/reviews', reviewsIndex)
router.post('/:id/reviews', authUser, reviewsUpsert)
router.get('/:id', show)
router.post('/', authAdmin, create)
router.put('/:id', authAdmin, updateOne)
router.delete('/:id', authAdmin, remove)

export default router
