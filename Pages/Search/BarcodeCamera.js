//BarcodeCamera 작동하는 화면

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Modal, Text, Alert, Pressable } from 'react-native';
import { TouchableRipple, Button } from 'react-native-paper';

import * as DBR from 'vision-camera-dynamsoft-barcode-reader';
import { launchImageLibrary } from 'react-native-image-picker';


import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { decode } from 'vision-camera-dynamsoft-barcode-reader';
import * as REA from 'react-native-reanimated';
import axios from 'axios';

// 서버
import ServerPort from '../../Components/ServerPort';
const IP = ServerPort();

//license 가져와잇!
import BarcodeLicense from '../../Components/BarcodeLicense';
const License = BarcodeLicense();

//아이콘
import Icon from 'react-native-vector-icons/FontAwesome5';

import { Card } from 'react-native-paper';

export default function Barcode({navigation}) {
    //카메라 사용여부
    const [useCamera, setUseCamera] = React.useState(true);
    //바코드 결과값
    const [barcodeResults, setBarcodeResults] = React.useState([]);
    //바코드 결과값 없을 경우
    const [nobar, setNobar] = React.useState(false);
    //카메라 허가 여부
    const [hasPermission, setHasPermission] = React.useState(false);
    //프레임 너비
    const [frameWidth, setFrameWidth] = React.useState(720);
    //프레임 높이
    const [frameHeight, setFrameHeight] = React.useState(1280);
    //카메라 장치
    const devices = useCameraDevices();
    //후면 카메라 선택
    const device = devices.back;

    const [modalVisible, setModalVisible] = React.useState(false);
    const [check, setCheck] = React.useState(false);

    React.useLayoutEffect(() => {
        navigation.setOptions({
          headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel='뒤로가기'>
                  <Image source={require('../../assets/left.png')} style={{ width: 30, height: 30, marginLeft: 10 }} />
              </TouchableOpacity>
          ),
          headerTitle: "바코드 인식",
        });
      }, [])
    
    //alert에서 보여줄 값
    const [pnm, setPnm] = React.useState(""); //제품명
    const [bnm, setBnm] = React.useState(""); //제조사명
    const [dcnm, setDcnm] = React.useState(""); //식품유형
    const [daycnt, setDaycnt] = React.useState(""); //유통/소비기한
    const [datatype,setDatatype] = React.useState("")//datatype저장

    React.useEffect(() => {
        (async () => {
            //라이센스 키
            await DBR.initLicense(`${License}`);
        })();
    }, []);

    React.useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'authorized');
        })();
    }, []);

    React.useEffect(() => {
        if(barcodeResults !== undefined){
            if(barcodeResults[0] !== undefined){
                if(barcodeResults[0].barcodeText !== undefined){
        onScanned(barcodeResults);
        }}}
    }, [barcodeResults]);

    const onScanned = async (results) => {
      console.log(results);
      setBarcodeResults(results);
    
      console.log("호출은 계속 되나?");
      //카메라 사용 안함
      if (results[0]) {
        setUseCamera(false);
        console.log("axios 호출");
        await axios
          .get(`${IP}/barcode/search`, {
            params: {
              // 약이름, page번호 요청
              barcode: results[0].barcodeText,
            },
          })
          .then((response) => {
            //음식 바코드 값이 있을 경우 
            if(response.data.data_type === "food"){
              console.log("foode로 들어와?");
              console.log("이름가져오나?", response.data);
              setPnm(response.data.data[0].PRDLST_NM);
              setBnm(response.data.data[0].BSSH_NM);
              setDcnm(response.data.data[0].PRDLST_DCNM);
              setDaycnt(response.data.data[0].POG_DAYCNT);
              setDatatype(response.data.data_type)
              setBarcodeResults(response.data.data[0]);
              setModalVisible(!modalVisible)
              setCheck(true);
            }
            //알약 바코드 값이 있을 경우
            else if(response.data.data_type === "medicine"){
              console.log("약",response.data.data)
              console.log("마!!!!",response.data.data[0])
              navigation.navigate('BarcodeMedicineDetail', {
                medicineBarcodeData: response.data.data
              });
              // navigation.navigate('BarcodeMedicineDetail', { medicineBarcodeData: response.data});
            }
            else{
              console.log("여기로 와?")
              console.log(response.data)
              setNobar(true); 
              setModalVisible(!modalVisible)
              setCheck(true);
            }
           
          })
          .catch((error) => {
            console.error(error);
          });
      }
      console.log("하여튼 찍혔다!");
    };

    //프레임 단위로 작동 함수
    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'
        const config = {};
        config.rotateImage = false;
        const results = decode(frame, config)
        if(!check){
        setCheck(true);
        console.log("height: " + frame.height);
        console.log("width: " + frame.width);
        console.log(results);
        REA.runOnJS(setBarcodeResults)(results);
        REA.runOnJS(setFrameWidth)(frame.width);
        REA.runOnJS(setFrameHeight)(frame.height);
        }
    }, [])

    if(modalVisible){
      console.log("데이터 타입 잘 가져와?", datatype)
      console.log("nobar", nobar)
        return (
          <View >
            <Modal
              presentationStyle={"formSheet"}
              animationType="slide"  // 모달 애니메이션 지정
              onRequestClose={() => setModalVisible(false)} // 모달 닫기 버튼 클릭 시 처리할 함수 지정, 안드로이드에서는 필수로 구현해야 합니다
              transparent={true} // 투명한 모달로 설정 
                           
            >
              
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  {nobar === true ? (
                    <View>
                      <Card>
                      <Card.Content>
                        <Text variant="bodyMedium">바코드에 등록된 정보가 없습니다.</Text>
                      </Card.Content>
                    </Card>
                      {/* 모달 닫기 버튼 클릭 시 모달을 닫는 동시에 카메라 켜기*/}
                      <TouchableRipple style={styles.button} onPress={() => { setModalVisible(false);setUseCamera(true);setNobar(!nobar);}}>
                        <Icon name="times" style={styles.Icon} color='black' size={50} accessibilityLabel='닫기' accessibilityRole='button'/>
                      </TouchableRipple>
                    </View>
                  ):(
                  <View>
                    {/* 음식일 경우 */}
                    { datatype === "food" ? (
                      <View>
                        {pnm && pnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="box" size={20} color="black" />
                              <Text style={styles.InfoTitle}>제품명</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{pnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                        ) : null}
                      {bnm && bnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="boxes" size={20} color="black" />
                              <Text style={styles.InfoTitle}>제조사명</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{bnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null}

                      {dcnm && dcnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="bread-slice" size={20} color="black" />
                              <Text style={styles.InfoTitle}>식품 유형</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{dcnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null}
                      {daycnt && daycnt ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="calendar-day" size={20} color="black" />
                              <Text style={styles.InfoTitle}>유통/소비기한</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{daycnt}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null}

                        {/* 모달 닫기 버튼 클릭 시 모달을 닫는 동시에 카메라 켜기*/}
                        <TouchableRipple style={styles.button} onPress={() => { setModalVisible(false);setUseCamera(true);}}>
                          <Icon name="times" style={styles.Icon} color='black' size={50} accessibilityLabel='닫기' accessibilityRole='button'/>
                        </TouchableRipple>

                      </View>
                    ): null}

                    {/* 약일 경우 */}
                    { datatype === "medicine" ? (
                      <View>
                        {/* {pnm && pnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="box" size={20} color="black" />
                              <Text style={styles.InfoTitle}>제품명</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{pnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                        ) : null}
                      {bnm && bnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="boxes" size={20} color="black" />
                              <Text style={styles.InfoTitle}>제조사명</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{bnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null}

                      {dcnm && dcnm ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="bread-slice" size={20} color="black" />
                              <Text style={styles.InfoTitle}>식품 유형</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{dcnm}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null}
                      {daycnt && daycnt ? (
                          <View style={{marginBottom:10,}}>
                            <View style={styles.Info2}>
                              <Icon style={styles.InfoIcon} name="calendar-day" size={20} color="black" />
                              <Text style={styles.InfoTitle}>유통/소비기한</Text>
                            </View>
                            <Card>
                              <Card.Content>
                                <Text variant="bodyMedium">{daycnt}</Text>
                              </Card.Content>
                            </Card>
                          </View>
                      ) : null} */}

                        {/* 모달 닫기 버튼 클릭 시 모달을 닫는 동시에 카메라 켜기*/}
                        <TouchableRipple style={styles.button} onPress={() => { setModalVisible(false);setUseCamera(true);}}>
                          <Icon name="times" style={styles.Icon} color='black' size={50} accessibilityLabel='닫기' accessibilityRole='button'/>
                        </TouchableRipple>

                      </View>
                    ): null}


                  </View>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        );
    }
    return (
        <View style={styles.container}>
          {/* 카메라 사용 중일 때 띄우는 화면 */}
          {useCamera && (
            <>
              {device != null && hasPermission && (
                <>
                  <Camera
                    style={{ width: '100%', height: '100%' }}
                    device={device}
                    isActive={true}
                    frameProcessor={frameProcessor}
                    frameProcessorFps={1}
                    onBarCodeScanned={onScanned} // 바코드 스캔 시 호출되는 콜백 함수
                  />
                </>
              )}
            </>
          )}
        </View>
      );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
  },
  title: {
      textAlign: 'center',
      marginVertical: 8,
  },
  separator: {
      marginVertical: 4,
  },
  switchView: {
      alignItems: 'center',
      flexDirection: "row",
  },
  barcodeText: {
      fontSize: 20,
      color: 'black',
      fontWeight: 'bold',
  },
  close:{
    flex:1,
    borderWidth: 1,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    // borderWidth: 1,
    marginBottom: 10,
    marginTop: 20,
    borderRadius: 5,
    height: 150,
    padding: 10,
    elevation: 2,
  },
      
  Informationcontainer: {
    flex: 1,
    borderWidth:1,
    // marginBottom: 40,
  },
  Info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: "center",
  },
  Info2: {
    flexDirection: 'row',
    alignItems: "center",
  },
  InfoTitle: {
    marginTop: 10,
    marginBottom: 15,
  },
  InfoIcon: {
    padding: 10,
  },
  Icon:{
    // borderWidth:1,
    width:100,
    marginLeft:60,
    
  },
  Infotext: {
    textAlignVertical: 'center'
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width:'80%',
    // alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // button: {
  //   borderRadius: 20,
  //   padding: 10,
  //   elevation: 2,
  // },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    // textAlign: 'center',
  },
});




 


