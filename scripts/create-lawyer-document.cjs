const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  LevelFormat,
  Header,
  Footer,
  PageNumber,
} = require('docx');
const fs = require('fs');

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
};

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Yu Gothic', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        run: { size: 36, bold: true, color: '000000', font: 'Yu Gothic' },
        paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, color: '000000', font: 'Yu Gothic' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, color: '333333', font: 'Yu Gothic' },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 22, bold: true, color: '444444', font: 'Yu Gothic' },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullet-list',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: '弁護士面談用資料', size: 18, color: '666666' })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                new TextRun({ text: ' / ', size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Title
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun('スマイディア様 HR評価システム開発')],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          children: [new TextRun({ text: '請求根拠資料', size: 32, bold: true })],
        }),

        // Meta info
        new Paragraph({ children: [new TextRun({ text: '作成日: 2026年1月22日', size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: '作成者: 神子 彩果', size: 20 })] }),
        new Paragraph({
          spacing: { after: 480 },
          children: [new TextRun({ text: '目的: 弁護士面談用 - 請求額の合理性と先方起因停止の証拠整理', size: 20 })],
        }),

        // Section 1
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. プロジェクト概要')] }),
        createTable([
          ['項目', '内容'],
          ['クライアント', '株式会社スマイディア（代表: 石光健太郎氏）'],
          ['案件名', 'HR評価システム開発'],
          ['契約形態', '口頭合意（書面契約は先方弁護士確認待ちで未締結）'],
          ['合意金額', '初期開発費 60万円 + 年間保守費 15万円'],
          ['開発期間', '2025年9月〜2025年12月（実質稼働）'],
        ]),

        // Section 2
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. 合意に至った経緯')] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.1 商談・交渉の時系列')] }),
        createTable([
          ['日付', 'イベント', '内容'],
          ['2025/09/17', '初回打合せ', '要件ヒアリング、6角形レーダーチャート等の仕様確認'],
          ['2025/09/25', 'デモ打合せ', 'プロトタイプ提示、仕様詳細化'],
          ['2025/09/27', '価格交渉', '当初見積150万円→60万円に値下げ合意'],
          ['2025/10/17', '契約条件確定', '石光社長より正式に条件提示・合意'],
          ['2025/10/21', '承諾返信', '当方より条件承諾の返信送付'],
        ]),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.2 合意内容（2025/10/17 石光社長メッセージより）')] }),
        new Paragraph({
          indent: { left: 360 },
          shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
          children: [new TextRun({ text: '【費用】', italics: true })],
        }),
        new Paragraph({
          indent: { left: 720 },
          children: [new TextRun('・初期開発費：60万円')],
        }),
        new Paragraph({
          indent: { left: 720 },
          children: [new TextRun('・ランニング費：年15万円（12,500円／月）※サーバー費・保守費として')],
        }),
        new Paragraph({
          indent: { left: 360 },
          shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
          children: [new TextRun({ text: '【権利の整理】', italics: true })],
        }),
        new Paragraph({
          indent: { left: 720 },
          children: [new TextRun('・人事評価制度の資料／評価データ：スマイディア様に帰属')],
        }),
        new Paragraph({
          indent: { left: 720 },
          spacing: { after: 240 },
          children: [new TextRun('・開発したソフトウェアの著作権：神子に帰属（社内継続利用は制限なし）')],
        }),

        // Section 3
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. 開発実績・工数')] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.1 開発作業（Gitコミット履歴に基づく）')] }),
        createTable([
          ['期間', 'コミット数', '主な作業内容'],
          ['2025/09/17〜09/30', '約40件', '初期セットアップ、基本機能実装'],
          ['2025/10/01〜10/31', '約50件', 'コア機能開発、認証・権限管理'],
          ['2025/11/01〜11/30', '約25件', 'UI改善、バグ修正、セキュリティ対応'],
          ['2025/12/01〜12/31', '約14件', 'Next.js 16対応、脆弱性修正'],
        ]),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: '総コミット数: 129件（HR評価システムのみ）', bold: true })],
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.2 工数見積（概算）')] }),
        createTable([
          ['作業区分', '時間', '備考'],
          ['開発作業', '120〜150時間', '設計、実装、テスト、デプロイ'],
          ['打合せ・調整', '23時間', '訪問6回 + オンライン会議'],
          ['移動時間', '12時間', '往復2時間 × 6回'],
          ['技術対応', '15〜20時間', 'Next.js 14→15→16アップグレード、脆弱性対応'],
          ['合計', '170〜205時間', ''],
        ]),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.3 完成度')] }),
        createTable([
          ['機能', '完成度', '状態'],
          ['ダッシュボード', '100%', '完成'],
          ['評価入力機能', '100%', '完成'],
          ['6角形レーダーチャート', '100%', '完成'],
          ['部門比較（表形式）', '100%', '完成'],
          ['マネージャー評価機能', '100%', '完成'],
          ['権限管理（4段階）', '100%', '完成'],
          ['Excelエクスポート', '100%', '完成'],
          ['従業員マスター管理', '100%', '完成'],
          ['実データ投入', '0%', '先方からの情報提供待ち'],
        ]),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: 'システム全体完成度: 95%（技術的には完成、実データ投入のみ未完了）', bold: true })],
        }),

        // Section 4
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. 先方起因による停止の証拠')] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 停止の直接原因')] }),
        createTable([
          ['項目', '状況', '証拠'],
          ['弁護士確認', '「1週間で完了」と約束→未完了のまま', 'LINE 2025/10/18, 11/01'],
          ['Excel雛形', '再三の依頼→未提供', 'LINE 2025/10/21, 11/08, 12/01'],
          ['連絡途絶', '2025/12/01以降、応答なし', 'LINE履歴'],
        ]),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 LINEやりとりの時系列（先方起因の証拠）')] }),
        createTable([
          ['日付', '発信者', '内容'],
          ['2025/10/18', '石光社長', '「弁護士に見てもらうお時間を1週間程いただければ」'],
          ['2025/10/21', '神子', '契約条件承諾返信、Excel雛形提供依頼'],
          ['2025/10/28', '神子', '弁護士確認の進捗確認'],
          ['2025/11/01', '石光社長', '「弁護士が多忙、もう少しお待ちを」'],
          ['2025/11/08', '神子', '再度Excel雛形の提供依頼'],
          ['2025/11/15', '神子', '進捗確認（応答なし）'],
          ['2025/12/01', '神子', '状況確認（応答なし）'],
          ['2025/12/01以降', '-', '先方からの連絡途絶'],
        ]),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.3 当方が完了を阻まれた理由')] }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '評価票Excel雛形が未提供', bold: true }), new TextRun(' - システムは完成しているが、実データ形式が不明のため投入不可（3回依頼）')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '従業員名簿が未提供', bold: true }), new TextRun(' - マスターデータ投入に必要な情報が得られず')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '弁護士確認が未完了', bold: true }), new TextRun(' - 「1週間」と言われてから2ヶ月以上経過')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          spacing: { after: 240 },
          children: [new TextRun({ text: '連絡が途絶', bold: true }), new TextRun(' - 2025/12/01以降、LINEへの応答なし')],
        }),

        // Section 5
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. 請求の合理性')] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.1 工数ベースの価値')] }),
        createTable([
          ['計算方法', '金額'],
          ['170時間 × 時給5,000円', '85万円'],
          ['205時間 × 時給5,000円', '102.5万円'],
          ['合意金額', '60万円'],
        ]),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: '→ 合意金額60万円は、実工数に対して大幅に割安な設定', bold: true })],
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.2 成果物の状態')] }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('システムは95%完成し、動作可能な状態')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('残り5%（実データ投入）は先方の情報提供がない限り完了不可能')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          spacing: { after: 240 },
          children: [new TextRun('技術的な瑕疵や遅延は当方に一切なし')],
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.3 請求根拠')] }),
        createTable([
          ['根拠', '詳細'],
          ['口頭合意', '2025/10/17に条件確定、10/21に承諾返信'],
          ['作業完了', '技術的には95%完成、先方起因で残り不可'],
          ['信義則', '合意に基づき開発を進め、成果物は納品可能状態'],
        ]),

        // Section 6
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6. 結論')] }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '契約成立の事実: ', bold: true }), new TextRun('2025/10/17に口頭合意、10/21に書面（メール）で承諾')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '当方の履行: ', bold: true }), new TextRun('システム開発95%完了、納品可能状態')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '先方の不履行: ', bold: true }), new TextRun('必要情報の未提供、弁護士確認の未完了、連絡途絶')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun({ text: '請求の正当性: ', bold: true }), new TextRun('合意金額60万円は実工数に対して妥当、むしろ割安')],
        }),
        new Paragraph({
          spacing: { before: 360, after: 240 },
          alignment: AlignmentType.CENTER,
          shading: { fill: 'FFFACD', type: ShadingType.CLEAR },
          children: [new TextRun({ text: '請求額: 60万円（初期開発費全額）', size: 28, bold: true })],
        }),

        // Attachments
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('添付資料（参考）')] }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('Gitコミット履歴（129件）')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('LINEやりとり記録（2025/09/17〜2025/12/01）')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('議事録（6件）')],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: [new TextRun('システムスクリーンショット（動作証明）')],
        }),

        // Footer
        new Paragraph({
          spacing: { before: 720 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '以上', size: 24 })],
        }),
      ],
    },
  ],
});

function createTable(data) {
  const numCols = data[0].length;
  const colWidth = Math.floor(9360 / numCols);
  const columnWidths = Array(numCols).fill(colWidth);

  return new Table({
    columnWidths,
    rows: data.map((row, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        children: row.map(
          (cell) =>
            new TableCell({
              borders: cellBorders,
              width: { size: colWidth, type: WidthType.DXA },
              shading: rowIndex === 0 ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: rowIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [new TextRun({ text: cell, bold: rowIndex === 0, size: 20 })],
                }),
              ],
            })
        ),
      })
    ),
  });
}

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = process.argv[2] || '/Users/kamikoyuuichi/kamiko-independence/projects/sumaidia/弁護士面談用資料_スマイディア請求根拠_2026-01-22.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document created: ${outputPath}`);
});
