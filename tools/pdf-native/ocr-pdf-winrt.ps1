# Requires Windows 10+ WinRT PDF + OCR
$ErrorActionPreference = 'Stop'

function Await($WinRtTask) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod } |
    Where-Object {
      $ps = $_.GetParameters()
      $ps[0].ParameterType.Name -match 'IAsyncOperation|IAsyncAction'
    } |
    Select-Object -First 1
  if (-not $asTask) {
    # fallback: AsTask<T>(IAsyncOperation<T>)
    $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
      Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod }).Where({
        $_.GetParameters().Count -eq 1
      })[0]
  }
  $tResult = $WinRtTask.GetType().GenericTypeArguments[0]
  $netTask = $asTask.MakeGenericMethod($tResult).Invoke($null, @($WinRtTask))
  $netTask.GetAwaiter().GetResult()
}

function AwaitAction($WinRtAction) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethod('AsTask', [Type[]]@([Windows.Foundation.IAsyncAction]))
  if (-not $asTask) {
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
      Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
      Select-Object -First 1
  }
  $netTask = $asTask.Invoke($null, @($WinRtAction))
  $netTask.GetAwaiter().GetResult()
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# Load WinRT types
$null = [Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]

$pdfPath = 'c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf'
$outDir = 'c:\xampp\htdocs\AutoDocsv7-docker\tools\pdf-native\magnus-assets\ocr'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Helper AsTask via reflection more reliably
function AsTaskResult($asyncOp) {
  $type = $asyncOp.GetType()
  $resultType = $type.GetGenericArguments()[0]
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1
    } | Where-Object {
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
  $generic = $method.MakeGenericMethod($resultType)
  $task = $generic.Invoke($null, @($asyncOp))
  $task.Result
}

function AsTaskVoid($asyncAction) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.FullName -eq 'Windows.Foundation.IAsyncAction'
    } | Select-Object -First 1
  if (-not $method) {
    # try by name match
    $method = [System.WindowsRuntimeSystemExtensions].GetMethod('AsTask', [Type[]]@([Windows.Foundation.IAsyncAction]))
  }
  $task = $method.Invoke($null, @($asyncAction))
  $task.Wait()
}

Write-Host "Loading PDF..."
$pdfFile = AsTaskResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath))
$doc = AsTaskResult ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($pdfFile))
Write-Host "Pages:" $doc.PageCount

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('pt-BR'))
if (-not $engine) {
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
Write-Host "OCR lang:" $engine.RecognizerLanguage.LanguageTag

$pagesOut = @()
for ($i = 0; $i -lt $doc.PageCount; $i++) {
  $page = $doc.GetPage($i)
  $stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
  $opts = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
  $opts.DestinationWidth = 1654  # ~A4 @ 200dpi
  AsTaskVoid ($page.RenderToStreamAsync($stream, $opts))
  $stream.Seek(0)

  # Save PNG via BitmapEncoder
  $decoder = AsTaskResult ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))
  $softwareBitmap = AsTaskResult ($decoder.GetSoftwareBitmapAsync())

  $outFile = Join-Path $outDir ("page-{0:D2}.png" -f ($i + 1))
  $outStorage = AsTaskResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync((New-Item -ItemType File -Force -Path $outFile).FullName))
  # rewrite: create via folder
  $folder = AsTaskResult ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDir))
  $fileName = ("page-{0:D2}.png" -f ($i + 1))
  $outStorage = AsTaskResult ($folder.CreateFileAsync($fileName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting))
  $outStream = AsTaskResult ($outStorage.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite))
  $encoder = AsTaskResult ([Windows.Graphics.Imaging.BitmapEncoder]::CreateAsync([Windows.Graphics.Imaging.BitmapEncoder]::PngEncoderId, $outStream))
  $encoder.SetSoftwareBitmap($softwareBitmap)
  AsTaskVoid ($encoder.FlushAsync())
  $outStream.Dispose()

  # OCR
  $ocrResult = AsTaskResult ($engine.RecognizeAsync($softwareBitmap))
  $text = $ocrResult.Text
  $pageObj = [ordered]@{
    index = $i + 1
    image = $fileName
    text = $text
    lineCount = $ocrResult.Lines.Count
  }
  $pagesOut += $pageObj
  Write-Host ("Page {0}: {1} chars, {2} lines" -f ($i+1), $text.Length, $ocrResult.Lines.Count)
  $page.Dispose()
  $stream.Dispose()
}

$jsonPath = Join-Path $outDir 'pdf-ocr.json'
$pagesOut | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
Write-Host "Wrote" $jsonPath
