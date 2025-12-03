"use server"

import { supabase } from "@/lib/supabase/client";

export const getCurrentSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data;
}