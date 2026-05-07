type Rule = { keywords: string[]; category: string }

const EXPENSE_RULES: Rule[] = [
  {
    keywords: ['스타벅스', '커피빈', '투썸플레이스', '이디야', '빽다방', '메가커피', '할리스', '폴바셋', '카페베네', '엔제리너스', '커피', '카페', '라떼'],
    category: '카페',
  },
  {
    keywords: ['배달의민족', '배민', '쿠팡이츠', '요기요', '맥도날드', '버거킹', '롯데리아', '서브웨이', 'KFC', '피자헛', '도미노', '치킨', '피자', '식당', '음식점', '이마트', '홈플러스', '롯데마트', '코스트코', '마트'],
    category: '식비',
  },
  {
    keywords: ['GS25', 'GS 25', 'CU편의점', ' CU ', 'CU_', '세븐일레븐', '7-eleven', '미니스톱', '이마트24', '편의점'],
    category: '편의점',
  },
  {
    keywords: ['지하철', '버스', '택시', '카카오T', 'T머니', '티머니', '주유', '고속도로', 'KTX', 'SRT', 'GS칼텍스', 'SK에너지', '에쓰오일', '현대오일뱅크', '기차표'],
    category: '교통',
  },
  {
    keywords: ['쿠팡', '네이버쇼핑', '11번가', 'G마켓', '옥션', '올리브영', '무신사', '아디다스', '나이키', '유니클로', 'ZARA', '자라', 'H&M', '위메프', '티몬', 'SSG', '신세계'],
    category: '쇼핑',
  },
  {
    keywords: ['넷플릭스', '유튜브프리미엄', '멜론', '스포티파이', '왓챠', '웨이브', '티빙', '시즌', '애플뮤직', '네이버플러스', 'Adobe', '어도비', 'Microsoft 365', '구독'],
    category: '구독',
  },
  {
    keywords: ['월세', '관리비', '전기세', '가스비', '수도세', '인터넷', 'SKT', ' KT ', 'LG유플러스', 'LGU+', '통신비'],
    category: '주거',
  },
  {
    keywords: ['병원', '약국', '의원', '한의원', '치과', '안과', '이비인후과', '피부과', '정형외과', '건강검진', '클리닉'],
    category: '의료',
  },
  {
    keywords: ['CGV', '롯데시네마', '메가박스', '영화', '게임', '스팀', 'PlayStation', '닌텐도', '공연', '전시', '콘서트', '뮤지컬'],
    category: '문화',
  },
  {
    keywords: ['학원', '과외', '교재', '수강료', '인프런', '유데미', '클래스101', '패스트캠퍼스'],
    category: '교육',
  },
  {
    keywords: ['주식', '펀드', '증권', '삼성증권', '키움증권', '토스증권', '미래에셋', 'KB증권', '보험료', '생명보험', '손해보험'],
    category: '투자',
  },
]

const INCOME_RULES: Rule[] = [
  { keywords: ['급여', '월급', '임금', '연봉'], category: '급여' },
  { keywords: ['이자', '배당', '주식', '펀드', '증권'], category: '투자' },
  { keywords: ['프리랜서', '알바', '부업', '외주'], category: '부업' },
]

export function getRuleBasedCategory(description: string, type: 'income' | 'expense' = 'expense'): string | null {
  const lower = description.toLowerCase()
  const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES
  for (const { keywords, category } of rules) {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) {
      return category
    }
  }
  return null
}
