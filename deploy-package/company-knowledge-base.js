// スマイディア様の会社情報・ナレッジベース
const companyKnowledge = {
    // 会社基本情報
    companyInfo: {
        name: "株式会社スマイディア",
        englishName: "SUMAIDIA Inc.",
        founded: "1979年",
        capital: "1,000万円",
        president: "代表取締役社長 石光 堅太郎",
        employees: "37名（2023年11月時点）",
        businessDescription: "広告総合代理業（企画デザイン／印刷・製造加工／Web・SNS・動画等のデジタル制作／採用コンサル）、アグリ事業（きくらげ栽培）",
        philosophy: "クリエイティビティですべての人を笑顔に",
        slogan: "印刷業から、課題解決企業へ。",
        headquarters: "〒520-3014 滋賀県栗東市川辺568-2",
        businessHours: "平日 8:30-18:00／土曜 隔週 8:30-18:00",
        holidays: "日曜・祝日・隔週土曜",
        phone: "077-552-1045",
        fax: "077-552-0890",
        email: "info@sumaiprint.com",
        website: "https://sumaidia.jp"
    },
    
    // 所在地情報
    locations: {
        headquarters: {
            name: "本社",
            address: "〒520-3014 滋賀県栗東市川辺568-2",
            access: "JR手原駅・草津駅より車、最寄りバス停「栗東運動公園」徒歩約2分、国道477号沿い",
            landmark: "栗東運動公園の西隣",
            parking: "有（台数不明）",
            mapUrl: "https://www.google.com/maps/dir/?api=1&destination=滋賀県栗東市川辺568-2"
        },
        factories: {
            koka: {
                name: "甲賀水口プリントファクトリー",
                address: "〒528-0068 滋賀県甲賀市水口町ひのきが丘36-6"
            }
        },
        offices: {
            tokyo: {
                name: "東京オフィス",
                address: "〒103-0027 東京都中央区日本橋3-2-14 日本橋KNビル4F"
            },
            shiga: [
                "大津営業所",
                "草津営業所",
                "守山営業所",
                "野洲営業所",
                "湖南営業所",
                "竜王営業所"
            ]
        }
    },
    
    // サービス一覧
    services: {
        printing: {
            businessCards: {
                name: "名刺印刷",
                description: "高品質な名刺を迅速にお届け",
                sizes: ["日本標準サイズ（91×55mm）", "二つ折り", "型抜き等の特殊形状"],
                printMethod: "オフセット（小ロットはオンデマンド）",
                options: ["型抜き", "二つ折り", "PP加工", "箔押し"],
                designSupport: "オリジナル制作対応"
            },
            flyers: {
                name: "チラシ・フライヤー印刷",
                description: "効果的な販促ツールを制作",
                sizes: ["A判各種（A3、A4、A5、A6）", "B判各種（B4、B5等）"],
                foldingOptions: ["二つ折り", "三つ折り", "観音折り"],
                options: ["片面/両面", "カラー/モノクロ"]
            },
            catalogs: {
                name: "カタログ・パンフレット印刷",
                description: "商品カタログから会社案内まで",
                binding: ["中綴じ", "無線綴じ"],
                coverOptions: "PP加工、箔押し等（要相談）"
            },
            posters: {
                name: "ポスター印刷",
                description: "インパクトのある大型印刷",
                largeFormat: "対応可（最大サイズ要確認）"
            },
            otherPrinting: {
                banners: "のぼり・横断幕対応可",
                stickers: "ステッカー・シール対応可",
                envelopes: "封筒各種・レターヘッド対応可",
                forms: "伝票・複写用紙（ノーカーボン等）対応可",
                packaging: "パッケージ印刷対応可（実績あり）",
                special: "特色・箔押し・UV等は要相談"
            }
        },
        digital: {
            webDesign: {
                name: "Webサイト制作",
                description: "レスポンシブ対応の企業サイト制作",
                cms: "WordPress、WIX等（要相談）",
                includes: ["デザイン", "コーディング", "基本的なSEO対策"]
            },
            landingPage: {
                name: "LP（ランディングページ）制作",
                description: "コンバージョン重視の1ページサイト"
            },
            webAds: {
                name: "バナー・Web広告デザイン",
                description: "運用・効果測定まで対応可能"
            },
            video: {
                name: "動画制作・編集",
                description: "プロモーション動画から採用動画まで"
            },
            sns: {
                name: "SNS運用代行",
                description: "効果的なSNSマーケティング支援"
            }
        },
        design: {
            logo: {
                name: "ロゴデザイン",
                description: "企業・商品のロゴ制作（実績あり）"
            },
            branding: {
                name: "ブランディング",
                description: "CI/VI設計、ブランドガイドライン策定"
            },
            illustration: {
                name: "イラスト制作",
                description: "採用漫画等の実績あり"
            },
            copywriting: {
                name: "コピーライティング",
                description: "効果的なキャッチコピー・文章作成"
            }
        }
    },
    
    // よくある質問と回答
    faq: {
        delivery: {
            standard: "仕様により異なる（小ロットは校了後数日〜1週間目安）",
            express: "要相談",
            shipping: "全国配送可能",
            workDays: "日祝休業、土曜は隔週稼働"
        },
        payment: {
            methods: "銀行振込（カード・電子決済は要確認）",
            invoice: "請求書発行可能",
            cancellation: "キャンセルポリシーは要確認"
        },
        design: {
            support: "デザイン制作対応可能",
            dataFormat: "AI/PDF推奨（トンボ・塗り足し3mm、画像350dpi目安）",
            quote: "見積もり無料"
        },
        quality: {
            printing: "オフセット4色機/1色機、各種製本設備完備",
            colorDifference: "モニターRGBと印刷CMYKで色差あり（色校正可能）",
            defectHandling: "不良時は刷り直し等で誠意対応"
        },
        data: {
            format: "AI/PDF推奨",
            specifications: "トンボ・塗り足し3mm、画像解像度350dpi目安",
            colorMode: "CMYK推奨（RGBからの変換は色味が変わる可能性あり）"
        }
    },
    
    // 特徴・強み
    strengths: [
        "創業1979年の実績と信頼（45年以上の歴史）",
        "企画〜デザイン〜印刷〜製本〜納品までワンストップ対応",
        "地域密着の提案力とスピード",
        "自社工場による安定品質",
        "Web・動画・SNS・採用支援など印刷＋αの総合力",
        "環境に配慮した印刷（FSC認証紙・植物性インク等は要相談）",
        "健康経営優良法人認定"
    ],
    
    // 営業情報
    businessInfo: {
        areas: "滋賀県中心、東京オフィス経由で首都圏対応、全国発送可",
        consultation: "出張・訪問対応可（条件は要相談）",
        order: "電話・フォームで無料見積もり",
        workflow: "1.お問い合わせ・ヒアリング → 2.無料見積 → 3.デザイン/入稿 → 4.校了・印刷 → 5.納品・請求",
        dataRequirements: "サイズ/数量/色数/用紙/加工/納期、原稿・画像・ロゴ等",
        approval: "メール等で校了連絡（対面は校正紙サインも）",
        progress: "節目ごとに担当より連絡",
        emergency: "状況共有の上、先行納品・再印刷等を協議"
    },
    
    // 実績・競合優位性
    achievements: {
        cases: [
            "観光Webサイトのリニューアル",
            "企業サイト制作（WIX含む）",
            "新商品パッケージデザイン",
            "社名変更に伴うブランディング"
        ],
        clients: "自治体・一般企業・外資系ブランド等",
        media: "公式オンラインジャーナルにインタビュー掲載あり",
        advantages: [
            "印刷業から課題解決企業への転換",
            "クロスメディア（Web/動画/SNS）対応力",
            "アグリ事業（きくらげ栽培）も展開"
        ]
    },
    
    // 業界用語解説
    glossary: {
        "CMYK": "印刷の基本4色（シアン・マゼンタ・イエロー・ブラック）。RGBと色域が異なるため差異が出ることあり",
        "トンボ": "仕上がり位置合わせ用のマーク",
        "塗り足し": "断裁時の余白部分。通常3mm必要",
        "PP加工": "表面保護用フィルム貼り（グロス/マット）",
        "型抜き": "専用木型で自由形状に打ち抜く加工",
        "箔押し": "金箔・銀箔を熱と圧力で転写する高級加工",
        "エンボス": "紙に凹凸をつける立体的な加工",
        "オフセット印刷": "大量印刷に適した高品質印刷方式",
        "オンデマンド印刷": "少量印刷に適したデジタル印刷方式",
        "中綴じ": "中央をホチキスで綴じる製本方法",
        "無線綴じ": "背を糊で固める製本方法",
        "レスポンシブ": "画面サイズに応じ自動レイアウトするWeb設計手法",
        "CMS": "Webをブラウザで編集できる仕組み（例：WordPress）",
        "LP": "ランディングページ。1ページ完結型のWebサイト",
        "CI/VI": "コーポレートアイデンティティ/ビジュアルアイデンティティ"
    },
    
    // 季節・その他情報
    seasonal: {
        busyPeriod: "年末（11-12月）、年度末（2-3月）が繁忙期傾向",
        seasonalProducts: "年賀状・暑中見舞い等",
        sdgs: "地域イベント協力、環境配慮、農業事業等のSDGs活動",
        employeeInfo: "従業員37名（2023年11月時点）",
        customerSegments: {
            individual: "小口印刷や各種制作に対応",
            corporate: "主要顧客。マーケティング全般を伴走支援",
            government: "入札・大量印刷の実績あり",
            npo: "要相談（社会貢献的配慮あり得る）"
        }
    }
};

// ナレッジベースから情報を検索する関数
function searchKnowledge(query) {
    const lowerQuery = query.toLowerCase();
    let results = [];
    
    // 会社情報検索
    if (lowerQuery.includes('会社') || lowerQuery.includes('スマイディア') || lowerQuery.includes('sumaidia')) {
        results.push(companyKnowledge.companyInfo);
    }
    
    // サービス検索
    if (lowerQuery.includes('名刺')) {
        results.push(companyKnowledge.services.printing.businessCards);
    }
    if (lowerQuery.includes('チラシ') || lowerQuery.includes('フライヤー')) {
        results.push(companyKnowledge.services.printing.flyers);
    }
    if (lowerQuery.includes('カタログ') || lowerQuery.includes('パンフレット')) {
        results.push(companyKnowledge.services.printing.catalogs);
    }
    if (lowerQuery.includes('ポスター')) {
        results.push(companyKnowledge.services.printing.posters);
    }
    if (lowerQuery.includes('web') || lowerQuery.includes('ホームページ') || lowerQuery.includes('サイト')) {
        results.push(companyKnowledge.services.digital.webDesign);
    }
    if (lowerQuery.includes('sns') || lowerQuery.includes('インスタ') || lowerQuery.includes('twitter')) {
        results.push(companyKnowledge.services.digital.sns);
    }
    if (lowerQuery.includes('動画') || lowerQuery.includes('ムービー')) {
        results.push(companyKnowledge.services.digital.video);
    }
    if (lowerQuery.includes('ロゴ')) {
        results.push(companyKnowledge.services.design.logo);
    }
    
    // 納期検索
    if (lowerQuery.includes('納期') || lowerQuery.includes('いつ') || lowerQuery.includes('急ぎ')) {
        results.push(companyKnowledge.faq.delivery);
    }
    
    // 支払い検索
    if (lowerQuery.includes('支払') || lowerQuery.includes('料金') || lowerQuery.includes('見積')) {
        results.push(companyKnowledge.faq.payment);
    }
    
    // 場所検索
    if (lowerQuery.includes('場所') || lowerQuery.includes('住所') || lowerQuery.includes('アクセス')) {
        results.push(companyKnowledge.locations);
    }
    
    // 営業時間検索
    if (lowerQuery.includes('営業時間') || lowerQuery.includes('休業日') || lowerQuery.includes('定休日')) {
        results.push({
            businessHours: companyKnowledge.companyInfo.businessHours,
            holidays: companyKnowledge.companyInfo.holidays
        });
    }
    
    // 用語検索
    Object.keys(companyKnowledge.glossary).forEach(term => {
        if (lowerQuery.includes(term.toLowerCase())) {
            results.push({
                term: term,
                explanation: companyKnowledge.glossary[term]
            });
        }
    });
    
    return results;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
    window.companyKnowledge = companyKnowledge;
    window.searchKnowledge = searchKnowledge;
}