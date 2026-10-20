# Hex Merge – turning on "Sign in with Apple"

The code is already in the game (v10). The **👤 Account** button on the home screen stays hidden until the two steps below are done — then it appears by itself. Guest play keeps working the whole time.

Good news: Apple sign-in is **already switched on** in your Supabase project (it was set up for Star Tiles), so you do **not** need a new Apple key or Services ID.

## Step 1 – Create the Hex Merge account table (2 minutes)
1. Open https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/sql/new (sign in if asked).
2. Open the file `supabase-account.sql` in the hex-merge folder (or on GitHub: https://github.com/Dhpa69/hex-merge/blob/main/supabase-account.sql), copy everything.
3. Paste it into the SQL box and click **Run**. You should see "Success".

## Step 2 – Allow Hex Merge's web address as a sign-in return page (1 minute)
1. Open https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/auth/url-configuration
2. Under **Redirect URLs**, click **Add URL** and enter exactly: `https://dhpa69.github.io/hex-merge/`
3. Click **Save**.

## Step 3 – Only if Apple shows an error after tapping the button
Apple must know the return page too. Open https://developer.apple.com/account/resources/identifiers/list/serviceId, click the Star Tiles web Services ID, then **Sign In with Apple → Configure**:
- Domains should include `etfhuwopqjderqutlyhk.supabase.co`
- Return URLs should include `https://etfhuwopqjderqutlyhk.supabase.co/auth/v1/callback`
(These are normally already there from Star Tiles. Click Save → Continue → Save if you changed anything.)

## Check it works
Open https://dhpa69.github.io/hex-merge/ → the **👤 Account** tile appears → **Sign in with Apple** → you come back to the game and see "Signed in — guest progress merged".

What syncs: coins, skins/themes/effects you own, XP and level, power-ups in your bag, chests, shards, badges, wins/games and ranks.
First sign-in on a device adds that device's guest progress to your account (coins earned beyond the starting 100, games/wins, items, badges; the higher level is kept).
