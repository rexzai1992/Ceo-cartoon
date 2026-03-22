import { createClient } from '@supabase/supabase-js';
import { CartoonRequest, Outlet } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function saveGeneration(
  request: CartoonRequest,
  imageUrl: string,
  status: 'success' | 'error' | 'pending' = 'success',
  beforeImageUrl?: string
) {
  if (!supabase) {
    console.warn('Supabase is not configured. Skipping database save.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('generations')
      .insert([
        {
          person_name: request.personName,
          gender: request.gender,
          business_name: request.businessName || 'N/A',
          business_type: request.businessType,
          image_url: imageUrl,
          before_image_url: beforeImageUrl || null,
          status: status,
          outlet: request.outlet || 'Melaka',
        },
      ])
      .select();

    if (error) {
      console.error('Error saving generation to Supabase:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error saving to Supabase:', err);
    throw err;
  }
}

export async function saveRegistration(parentName: string, phoneNumber: string, kids: {name: string, age: string}[], outlet: Outlet) {
  if (!supabase) {
    console.warn('Supabase is not configured. Skipping database save.');
    return null;
  }

  try {
    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .insert([{ parent_name: parentName, phone_number: phoneNumber, outlet: outlet }])
      .select()
      .single();

    if (regError) throw regError;

    const kidsData = kids.map(k => ({
      registration_id: regData.id,
      name: k.name,
      age: parseInt(k.age, 10) || 0,
      outlet: outlet
    }));

    const { error: kidsError } = await supabase
      .from('kids')
      .insert(kidsData);

    if (kidsError) throw kidsError;

    return regData;
  } catch (err) {
    console.error('Error saving registration:', err);
    throw err;
  }
}

export async function getRegistrations() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        parent_name,
        phone_number,
        outlet,
        created_at,
        kids (
          id,
          name,
          age
        )
      `)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw error;

    return data.map(d => ({
      id: d.id,
      parentName: d.parent_name,
      phoneNumber: d.phone_number,
      outlet: d.outlet,
      date: d.created_at,
      kids: d.kids.map((k: any) => ({ id: k.id, name: k.name, age: k.age.toString() }))
    }));
  } catch (err) {
    console.error('Error fetching registrations:', err);
    return [];
  }
}

export async function getRegistrationCount(outlet: Outlet) {
  if (!supabase) return 0;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('kids')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
      .eq('outlet', outlet);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Error fetching registration count:', err);
    return 0;
  }
}

export async function deleteRegistration(id: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('registrations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting registration:', err);
    throw err;
  }
}
