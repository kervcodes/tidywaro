import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

export class WardrobeController {

    static async listItems(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user.id;

            // Use scoped client if available, otherwise global
            const client = (req as AuthRequest).supabase || supabase;

            const { data, error } = await client
                .from('wardrobe_items')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async uploadItem(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            // Use scoped client if available
            const client = (req as AuthRequest).supabase || supabase;

            // 1. Upload to Supabase Storage
            const filePath = `${userId}/${Date.now()}_${file.originalname}`;

            const { data: storageData, error: storageError } = await client
                .storage
                .from('wardrobe-items')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                });

            if (storageError) {
                throw storageError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = client
                .storage
                .from('wardrobe-items')
                .getPublicUrl(filePath);

            // 3. Save Metadata to Database
            const { data: dbData, error: dbError } = await client
                .from('wardrobe_items')
                .insert({
                    user_id: userId,
                    image_url: publicUrl,
                    category: req.body.category || 'uncategorized',
                })
                .select()
                .single();

            if (dbError) {
                throw dbError;
            }

            res.status(201).json(dbData);
        } catch (error: any) {
            console.error('Upload error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
