// Function to generate sequential admin code: AKC_0001, AKC_0002, etc.
// This needs to be called from the server to get the next number from database
export async function generateSequentialAdminCode(supabase: any): Promise<string> {
  // Get the highest existing admin code number
  const { data: existingCodes, error } = await supabase
    .from('profiles')
    .select('admin_code')
    .not('admin_code', 'is', null)
    .like('admin_code', 'AKC_%')
    .order('admin_code', { ascending: false })
    .limit(1);

  let nextNumber = 1;

  if (!error && existingCodes && existingCodes.length > 0) {
    // Extract number from the highest code (e.g., AKC_0001 -> 1)
    const lastCode = existingCodes[0].admin_code;
    const match = lastCode.match(/AKC_(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format as AKC_0001, AKC_0002, etc. (4 digits padded)
  const formattedNumber = nextNumber.toString().padStart(4, '0');
  return `AKC_${formattedNumber}`;
}

// Function to generate recovery code: RCW_ + random 6 digits
export function generateRecoveryCode(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digit random number
  return `RCW_${randomNum}`;
}

// Function to generate user code: UCW_ + random 6 digits
export function generateUserCode(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digit random number
  return `UCW_${randomNum}`;
}

// Function to generate admin screen code: ACW_ + random 6 digits (for UI gate)
export function generateScreenCode(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ACW_${randomNum}`;
}


