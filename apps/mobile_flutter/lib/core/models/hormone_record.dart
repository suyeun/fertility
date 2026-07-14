/// Mirrors packages/shared/types/index.ts HormoneRecord — a flat catch-all
/// record for daily/clinic numeric fields across natural + IUI/IVF stages.
class HormoneRecord {
  HormoneRecord({
    required this.id,
    required this.userId,
    required this.recordedAt,
    this.amh,
    this.fsh,
    this.lh,
    this.estradiol,
    this.progesterone,
    this.bbt,
    this.opkIndex,
    this.cervicalMucus,
    this.weight,
    this.sleepHours,
    this.follicleSize,
    this.endometriumThickness,
    this.retrievedOocytesCount,
    this.embryoGrade,
    this.hcgLevel,
    this.injectionDrug,
    this.injectionDose,
    this.follicleCount,
    this.maxFollicle,
    this.opkResult,
    this.suppType,
    this.symptoms,
    this.judgmentResult,
    this.follicleRight,
    this.follicleLeft,
    this.mature18Plus,
    this.totalOocytes,
    this.matureOocytes,
    this.condition,
    this.twoPN,
    this.day3Embryo,
    this.blastocyst,
    this.frozenEmbryo,
    this.transferredEmbryos,
    this.transferMethod,
    this.intercourse,
    this.notes,
  });

  final String id;
  final String userId;
  final String recordedAt;

  final double? amh;
  final double? fsh;
  final double? lh;
  final double? estradiol;
  final double? progesterone;
  final double? bbt;
  final double? opkIndex;
  final String? cervicalMucus; // dry | sticky | creamy | eggwhite
  final double? weight;
  final double? sleepHours;

  final double? follicleSize;
  final double? endometriumThickness;
  final int? retrievedOocytesCount;
  final String? embryoGrade;
  final double? hcgLevel;

  final String? injectionDrug;
  final double? injectionDose;
  final int? follicleCount;

  final int? maxFollicle;
  final String? opkResult;

  final String? suppType;
  final String? symptoms;

  final String? judgmentResult;

  final int? follicleRight;
  final int? follicleLeft;

  final int? mature18Plus;

  final int? totalOocytes;
  final int? matureOocytes;
  final int? condition;

  final int? twoPN;
  final int? day3Embryo;
  final int? blastocyst;
  final int? frozenEmbryo;

  final int? transferredEmbryos;
  final String? transferMethod;

  final bool? intercourse;
  final String? notes;

  factory HormoneRecord.fromJson(Map<String, dynamic> j) {
    double? d(String key) => (j[key] as num?)?.toDouble();
    int? i(String key) => (j[key] as num?)?.toInt();
    return HormoneRecord(
      id: j['id'] as String,
      userId: j['userId'] as String? ?? '',
      recordedAt: j['recordedAt'] as String? ?? '',
      amh: d('amh'),
      fsh: d('fsh'),
      lh: d('lh'),
      estradiol: d('estradiol'),
      progesterone: d('progesterone'),
      bbt: d('bbt'),
      opkIndex: d('opkIndex'),
      cervicalMucus: j['cervicalMucus'] as String?,
      weight: d('weight'),
      sleepHours: d('sleepHours'),
      follicleSize: d('follicleSize'),
      endometriumThickness: d('endometriumThickness'),
      retrievedOocytesCount: i('retrievedOocytesCount'),
      embryoGrade: j['embryoGrade'] as String?,
      hcgLevel: d('hcgLevel'),
      injectionDrug: j['injectionDrug'] as String?,
      injectionDose: d('injectionDose'),
      follicleCount: i('follicleCount'),
      maxFollicle: i('maxFollicle'),
      opkResult: j['opkResult'] as String?,
      suppType: j['suppType'] as String?,
      symptoms: j['symptoms'] as String?,
      judgmentResult: j['judgmentResult'] as String?,
      follicleRight: i('follicleRight'),
      follicleLeft: i('follicleLeft'),
      mature18Plus: i('mature18Plus'),
      totalOocytes: i('totalOocytes'),
      matureOocytes: i('matureOocytes'),
      condition: i('condition'),
      twoPN: i('twoPN'),
      day3Embryo: i('day3Embryo'),
      blastocyst: i('blastocyst'),
      frozenEmbryo: i('frozenEmbryo'),
      transferredEmbryos: i('transferredEmbryos'),
      transferMethod: j['transferMethod'] as String?,
      intercourse: j['intercourse'] as bool?,
      notes: j['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{
      'id': id,
      'userId': userId,
      'recordedAt': recordedAt,
    };
    void put(String key, Object? value) {
      if (value != null) m[key] = value;
    }

    put('amh', amh);
    put('fsh', fsh);
    put('lh', lh);
    put('estradiol', estradiol);
    put('progesterone', progesterone);
    put('bbt', bbt);
    put('opkIndex', opkIndex);
    put('cervicalMucus', cervicalMucus);
    put('weight', weight);
    put('sleepHours', sleepHours);
    put('follicleSize', follicleSize);
    put('endometriumThickness', endometriumThickness);
    put('retrievedOocytesCount', retrievedOocytesCount);
    put('embryoGrade', embryoGrade);
    put('hcgLevel', hcgLevel);
    put('injectionDrug', injectionDrug);
    put('injectionDose', injectionDose);
    put('follicleCount', follicleCount);
    put('maxFollicle', maxFollicle);
    put('opkResult', opkResult);
    put('suppType', suppType);
    put('symptoms', symptoms);
    put('judgmentResult', judgmentResult);
    put('follicleRight', follicleRight);
    put('follicleLeft', follicleLeft);
    put('mature18Plus', mature18Plus);
    put('totalOocytes', totalOocytes);
    put('matureOocytes', matureOocytes);
    put('condition', condition);
    put('twoPN', twoPN);
    put('day3Embryo', day3Embryo);
    put('blastocyst', blastocyst);
    put('frozenEmbryo', frozenEmbryo);
    put('transferredEmbryos', transferredEmbryos);
    put('transferMethod', transferMethod);
    put('intercourse', intercourse);
    put('notes', notes);
    return m;
  }
}
