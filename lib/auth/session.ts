"use server"

import { supabase } from "@/lib/supabase/client";

export const getCurrentSession = async () => {
    return await supabase.auth.getSession();
}