import 'enums.dart';

class Hospital {
  Hospital({
    required this.id,
    required this.name,
    required this.region,
    required this.address,
    this.lat,
    this.lng,
    required this.phone,
    required this.specialties,
    this.website,
    this.avgCost,
    this.rating,
    this.reviewCount,
    this.tags,
    this.note,
    required this.isVerified,
    this.createdAt,
    this.isSponsored = false,
    this.sponsorBadgeLabel = '광고',
  });

  final String id;
  final String name;
  final String region;
  final String address;
  final double? lat;
  final double? lng;
  final String phone;
  final List<HospitalSpecialty> specialties;
  final String? website;
  final String? avgCost;
  final double? rating;
  final int? reviewCount;
  final List<String>? tags;
  final String? note;
  final bool isVerified;
  final String? createdAt;

  /// 정액 광고 계약 기간 중인 병원 — 목록의 "광고" 구역에만 표시된다.
  final bool isSponsored;
  final String sponsorBadgeLabel;

  factory Hospital.fromJson(Map<String, dynamic> j) => Hospital(
    id: j['id'] as String,
    name: j['name'] as String? ?? '',
    region: j['region'] as String? ?? '',
    address: j['address'] as String? ?? '',
    lat: (j['lat'] as num?)?.toDouble(),
    lng: (j['lng'] as num?)?.toDouble(),
    phone: j['phone'] as String? ?? '',
    specialties:
        (j['specialties'] as List?)?.map((e) => e.toString()).toList() ??
        const [],
    website: j['website'] as String?,
    avgCost: j['avgCost'] as String?,
    rating: (j['rating'] as num?)?.toDouble(),
    reviewCount: (j['reviewCount'] as num?)?.toInt(),
    tags: (j['tags'] as List?)?.map((e) => e.toString()).toList(),
    note: j['note'] as String?,
    isVerified: j['isVerified'] as bool? ?? false,
    createdAt: j['createdAt'] as String?,
    isSponsored: j['isSponsored'] == true,
    sponsorBadgeLabel:
        ((j['sponsorship'] as Map<String, dynamic>?)?['badgeLabel']
            as String?) ??
        '광고',
  );
}

class HospitalSuggestPayload {
  HospitalSuggestPayload({
    required this.name,
    required this.region,
    required this.address,
    this.phone,
    this.specialties,
    this.note,
  });

  final String name;
  final String region;
  final String address;
  final String? phone;
  final List<HospitalSpecialty>? specialties;
  final String? note;

  Map<String, dynamic> toJson() => {
    'name': name,
    'region': region,
    'address': address,
    if (phone != null) 'phone': phone,
    if (specialties != null) 'specialties': specialties,
    if (note != null) 'note': note,
  };
}
