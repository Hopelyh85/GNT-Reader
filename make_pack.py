import csv

# 1. 소장님의 규칙에 따라 교정된 샘플 데이터 (개신교 표준 용어 반영)
data_samples = [
    {
        "book": "MAT", "chapter": 1, "verse": 1, 
        "text": "Χριστοῦ", "lemma": "Χριστός", "morph": "N----GSM-",
        "definition": "그리스도, 메시아 (기름 부음 받은 자)",
        "krv": "예수 그리스도의 계보라", 
        "net": "The record of the genealogy of Jesus Christ"
    },
    {
        "book": "MAT", "chapter": 1, "verse": 1, 
        "text": "υἱοῦ", "lemma": "υἱός", "morph": "N----GSM-",
        "definition": "아들, 자손",
        "krv": "예수 그리스도의 계보라", 
        "net": "The record of the genealogy of Jesus Christ"
    }
]

def generate_csv():
    filename = "gnt_master_data.csv"
    # 소장님이 원하시는 데이터 필드 구성 
    fields = ["book", "chapter", "verse", "text", "lemma", "morph", "definition", "krv", "net"]
    
    # utf-8-sig: 엑셀과 Supabase에서 한글/그리스어가 깨지지 않게 보장합니다. 
    with open(filename, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(data_samples)
    
    print(f"✅ {filename} 생성 완료! 이제 Supabase에 업로드할 준비가 되었습니다.")

if __name__ == "__main__":
    generate_csv()