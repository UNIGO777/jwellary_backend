import { Router } from 'express'
import { uploadImage, uploadVideo } from '../middlewares/upload.js'
import { uploadSingle, uploadMultiple } from '../controllers/filesController.js'
import { authAdmin } from '../middlewares/auth.js'

const router = Router()

router.post('/image', authAdmin, uploadImage.single('image'), uploadSingle)
router.post('/images', authAdmin, uploadImage.array('images', 10), uploadMultiple)
router.post('/video', authAdmin, uploadVideo.single('video'), uploadSingle)

export default router
