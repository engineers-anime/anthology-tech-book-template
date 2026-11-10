// biome-ignore lint/style/useNodejsImportProtocol: プロジェクトの都合で CommonJS を使用するため
const fs = require('fs')
const { PDFDocument } = require('pdf-lib')

/**
 * 本文 PDF に表紙画像と裏表紙画像を挿入するスクリプト
 *
 * 本文 PDF の `book/output/ebook.pdf` と表紙画像の `book/cover/cover.png`、
 * 裏表紙画像の `book/cover/back_cover.png` が存在する時、
 * 表紙画像を1ページ目に、裏表紙画像を最終ページに挿入した PDF `book/output/ebook.pdf` を生成（上書き）します。
 */

// 本文 PDF のパス（入力）
const pdfPath = 'book/output/ebook.pdf'

// 表紙画像 のパス（入力）
const imagePath = 'book/cover/cover.png'

// 裏表紙画像 のパス（入力）
const backImagePath = 'book/cover/back_cover.png'

// 表紙・裏表紙画像を挿入した後の PDF のパス（出力。同じファイルに上書き保存します）
const outputPath = 'book/output/ebook.pdf'

// A5 のサイズ
const pageWidth = 419.53
const pageHeight = 595.25

/**
 * PDF に表紙・裏表紙画像を挿入する
 */
const insertCovers = async () => {
  // ファイルの存在を確認する
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file "${pdfPath}" does not exist.`)
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file "${imagePath}" does not exist.`)
  }
  if (!fs.existsSync(backImagePath)) {
    throw new Error(`Back cover image file "${backImagePath}" does not exist.`)
  }

  // PDFを読み込む
  const pdfBytes = fs.readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // 表紙画像を読み込んで埋め込む
  const imageBytes = fs.readFileSync(imagePath)
  const embeddedImage = imagePath.endsWith('.png')
    ? await pdfDoc.embedPng(imageBytes)
    : imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')
      ? await pdfDoc.embedJpg(imageBytes)
      : (() => {
          throw new Error('Unsupported front cover image format. Use PNG or JPG.')
        })()

  // 新しいページを最初のページに作成する (ページサイズを指定)
  const frontPage = pdfDoc.insertPage(0, [pageWidth, pageHeight])

  // 表紙画像をページ全体に描画する
  frontPage.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  })

  // 裏表紙画像を読み込んで埋め込む
  const backImageBytes = fs.readFileSync(backImagePath)
  const embeddedBackImage = backImagePath.endsWith('.png')
    ? await pdfDoc.embedPng(backImageBytes)
    : backImagePath.endsWith('.jpg') || backImagePath.endsWith('.jpeg')
      ? await pdfDoc.embedJpg(backImageBytes)
      : (() => {
          throw new Error('Unsupported back cover image format. Use PNG or JPG.')
        })()

  // 新しいページを最後のページとして作成する (getPageCount() の位置に挿入)
  const backPage = pdfDoc.insertPage(pdfDoc.getPageCount(), [pageWidth, pageHeight])

  // 裏表紙画像をページ全体に描画する
  backPage.drawImage(embeddedBackImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  })

  // PDFを保存
  const newPdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputPath, newPdfBytes)
}

// 表紙・裏表紙画像を挿入する
insertCovers().catch((err) => {
  console.warn(err.message)
})
