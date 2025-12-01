
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config';

// Supabase istemcisini oluştur
// Eğer config.ts henüz ayarlanmadıysa hata vermemesi için boş kontrolü yapıyoruz,
// ancak uygulama çalışmayacaktır.
const supabaseUrl = SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = SUPABASE_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseKey);
