$ErrorActionPreference = 'Stop'
$base='http://127.0.0.1:3001/api'
function J($o){$o|ConvertTo-Json -Depth 8 -Compress}

$custLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (J @{email='customer@test.com';password='password123'})
$barbLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (J @{email='barber.resume.test@trimride.app';password='password123'})
$custHdr = @{ Authorization = "Bearer $($custLogin.token)" }
$barbHdr = @{ Authorization = "Bearer $($barbLogin.token)" }

# Ensure the barber is available for dispatch during this rehearsal run.
$null = Invoke-RestMethod -Method Post -Uri "$base/barbers/status" -Headers $barbHdr -ContentType 'application/json' -Body (J @{isOnline=$true})

$dispatch = Invoke-RestMethod -Method Get -Uri "$base/barbers/dispatch?lat=-26.2041&lng=28.0473&limit=1"
if (-not $dispatch -or $dispatch.Count -lt 1) { throw 'No dispatch barber found' }
$barberProfileId = [int]$dispatch[0].id

$results = @()
function Add-Result($name,$ok,$note){ $script:results += [pscustomobject]@{Step=$name;Status=($(if($ok){'PASS'}else{'FAIL'}));Note=$note} }

$book1 = Invoke-RestMethod -Method Post -Uri "$base/customers/book" -Headers $custHdr -ContentType 'application/json' -Body (J @{barberId=$barberProfileId;bookingType='queue'})
$bookingId1 = [int]$book1.id
Add-Result 'Customer request #1' ($bookingId1 -gt 0) "bookingId=$bookingId1"

$reqs1 = Invoke-RestMethod -Method Get -Uri "$base/bookings/my-requests" -Headers $barbHdr
$seen1 = @($reqs1 | Where-Object { [int]$_.id -eq $bookingId1 }).Count -gt 0
Add-Result 'Barber sees request #1' $seen1 (if($seen1){'visible in my-requests'}else{'not visible'})

$accept1 = Invoke-RestMethod -Method Post -Uri "$base/bookings/$bookingId1/respond" -Headers $barbHdr -ContentType 'application/json' -Body (J @{action='accept'})
Add-Result 'Barber accept #1' ($accept1.status -eq 'confirmed') "status=$($accept1.status)"

$active = Invoke-RestMethod -Method Get -Uri "$base/customers/my-booking" -Headers $custHdr
Add-Result 'Customer active booking updates' ([int]$active.id -eq $bookingId1) "activeId=$($active.id)"

$null = Invoke-RestMethod -Method Post -Uri "$base/bookings/$bookingId1/location" -Headers $barbHdr -ContentType 'application/json' -Body (J @{latitude=-26.2041;longitude=28.0473})
Add-Result 'Barber location update accepted' $true 'location endpoint accepted'

$book2 = Invoke-RestMethod -Method Post -Uri "$base/customers/book" -Headers $custHdr -ContentType 'application/json' -Body (J @{barberId=$barberProfileId;bookingType='queue'})
$bookingId2 = [int]$book2.id
Add-Result 'Customer request #2' ($bookingId2 -gt 0) "bookingId=$bookingId2"

$reqs2 = Invoke-RestMethod -Method Get -Uri "$base/bookings/my-requests" -Headers $barbHdr
$seen2 = @($reqs2 | Where-Object { [int]$_.id -eq $bookingId2 }).Count -gt 0
Add-Result 'Barber sees request #2' $seen2 (if($seen2){'visible in my-requests'}else{'not visible'})

$decline2 = Invoke-RestMethod -Method Post -Uri "$base/bookings/$bookingId2/respond" -Headers $barbHdr -ContentType 'application/json' -Body (J @{action='decline'})
Add-Result 'Barber decline #2' ($decline2.status -eq 'cancelled') "status=$($decline2.status)"

$hist = Invoke-RestMethod -Method Get -Uri "$base/customers/my-bookings?limit=10" -Headers $custHdr
$histHas = @($hist | Where-Object { [int]$_.id -eq $bookingId2 -and $_.status -eq 'cancelled' }).Count -gt 0
Add-Result 'Customer sees declined in history' $histHas (if($histHas){'cancelled booking found'}else{'not found yet'})

$results | Format-Table -AutoSize | Out-String
